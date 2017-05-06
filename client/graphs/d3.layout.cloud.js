// (function(exports) {

// Copies a variable number of methods from source to target.
d3.rebind = function(target, source) {
  var i = 1, n = arguments.length, method;
  while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
  return target;
};

// Method is assumed to be a standard D3 getter-setter:
// If passed with no arguments, gets the value.
// If passed with arguments, sets the value and returns the target.
function d3_rebind(target, source, method) {
  return function() {
    var value = method.apply(source, arguments);
    return value === source ? target : value;
  };
}

function d3_functor(v) {
  return typeof v === "function" ? v : function() { return v; };
}
d3.functor = d3_functor;

//==========================================================================
//--------------DISPATCH-------------------------------------------------------
var noop = {value: function() {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

//------------------------------------------------------------------
function cloud() {
	var size = [256, 256],
		text = cloudText,
		font = cloudFont,
		fontSize = cloudFontSize,
		fontStyle = cloudFontNormal,
		fontWeight = cloudFontNormal,
		rotate = cloudRotate,
		padding = cloudPadding,
		spiral = archimedeanSpiral,
		words = [],
		timeInterval = Infinity,
		event = dispatch("word", "end"),
		timer = null,
		cloud = {};

	cloud.start = function () {
		var board = zeroArray((size[0] >> 5) * size[1]),
			bounds = null,
			n = words.length,
			i = -1,
			tags = [],
			data = words.map(function (d, i) {
				d.text = text.call(this, d, i);
				d.font = font.call(this, d, i);
				d.style = fontStyle.call(this, d, i);
				d.weight = fontWeight.call(this, d, i);
				d.rotate = rotate.call(this, d, i);
				d.size = ~~fontSize.call(this, d, i);
				d.padding = padding.call(this, d, i);
				return d;
			}).sort(function (a, b) { return b.size - a.size; });

		if (timer) clearInterval(timer);
		timer = setInterval(step, 0);
		step();

		return cloud;

		function step() {
			var start = +new Date,
				d;
			while (+new Date - start < timeInterval && ++i < n && timer) {
				d = data[i];
				d.x = (size[0] * (Math.random() + .5)) >> 1;
				d.y = (size[1] * (Math.random() + .5)) >> 1;
				cloudSprite(d, data, i);
				if (d.hasText && place(board, d, bounds)) {
					tags.push(d);
					event.call('word', null, d);
					if (bounds) cloudBounds(bounds, d);
					else bounds = [{ x: d.x + d.x0, y: d.y + d.y0 }, { x: d.x + d.x1, y: d.y + d.y1 }];
					// Temporary hack
					d.x -= size[0] >> 1;
					d.y -= size[1] >> 1;
				}
			}
			if (i >= n) {
				cloud.stop();
				event.call('end', null, tags, bounds);
			}
		}
	}

	cloud.stop = function () {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		return cloud;
	};

	cloud.timeInterval = function (x) {
		if (!arguments.length) return timeInterval;
		timeInterval = x == null ? Infinity : x;
		return cloud;
	};

	function place(board, tag, bounds) {
		var perimeter = [{ x: 0, y: 0 }, { x: size[0], y: size[1] }],
			startX = tag.x,
			startY = tag.y,
			maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]),
			s = spiral(size),
			dt = Math.random() < .5 ? 1 : -1,
			t = -dt,
			dxdy,
			dx,
			dy;

		while (dxdy = s(t += dt)) {
			dx = ~~dxdy[0];
			dy = ~~dxdy[1];

			if (Math.min(dx, dy) > maxDelta) break;

			tag.x = startX + dx;
			tag.y = startY + dy;

			if (tag.x + tag.x0 < 0 || tag.y + tag.y0 < 0 ||
				tag.x + tag.x1 > size[0] || tag.y + tag.y1 > size[1]) continue;
			// TODO only check for collisions within current bounds.
			if (!bounds || !cloudCollide(tag, board, size[0])) {
				if (!bounds || collideRects(tag, bounds)) {
					var sprite = tag.sprite,
						w = tag.width >> 5,
						sw = size[0] >> 5,
						lx = tag.x - (w << 4),
						sx = lx & 0x7f,
						msx = 32 - sx,
						h = tag.y1 - tag.y0,
						x = (tag.y + tag.y0) * sw + (lx >> 5),
						last;
					for (var j = 0; j < h; j++) {
						last = 0;
						for (var i = 0; i <= w; i++) {
							board[x + i] |= (last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
						}
						x += sw;
					}
					delete tag.sprite;
					return true;
				}
			}
		}
		return false;
	}

	cloud.words = function (x) {
		if (!arguments.length) return words;
		words = x;
		return cloud;
	};

	cloud.size = function (x) {
		if (!arguments.length) return size;
		size = [+x[0], +x[1]];
		return cloud;
	};

	cloud.font = function (x) {
		if (!arguments.length) return font;
		font = d3.functor(x);
		return cloud;
	};

	cloud.fontStyle = function (x) {
		if (!arguments.length) return fontStyle;
		fontStyle = d3.functor(x);
		return cloud;
	};

	cloud.fontWeight = function (x) {
		if (!arguments.length) return fontWeight;
		fontWeight = d3.functor(x);
		return cloud;
	};

	cloud.rotate = function (x) {
		if (!arguments.length) return rotate;
		rotate = d3.functor(x);
		return cloud;
	};

	cloud.text = function (x) {
		if (!arguments.length) return text;
		text = d3.functor(x);
		return cloud;
	};

	cloud.spiral = function (x) {
		if (!arguments.length) return spiral;
		spiral = spirals[x + ""] || x;
		return cloud;
	};

	cloud.fontSize = function (x) {
		if (!arguments.length) return fontSize;
		fontSize = d3.functor(x);
		return cloud;
	};

	cloud.padding = function (x) {
		if (!arguments.length) return padding;
		padding = d3.functor(x);
		return cloud;
	};

	//this is the version 3 way of doing things
	return d3.rebind(cloud, event, "on");
}

function cloudText(d) {
	return d.text;
}

function cloudFont() {
	return "serif";
}

function cloudFontNormal() {
	return "normal";
}

function cloudFontSize(d) {
	return Math.sqrt(d.value);
}

function cloudRotate() {
	return (~~(Math.random() * 6) - 3) * 30;
}

function cloudPadding() {
	return 1;
}

// Fetches a monochrome sprite bitmap for the specified text.
// Load in batches for speed.
function cloudSprite(d, data, di) {
	if (d.sprite) return;
	c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio);
	var x = 0,
		y = 0,
		maxh = 0,
		n = data.length;
	--di;
	while (++di < n) {
		d = data[di];
		c.save();
		c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;
		var w = c.measureText(d.text + "m").width * ratio,
			h = d.size << 1;
		if (d.rotate) {
			var sr = Math.sin(d.rotate * cloudRadians),
				cr = Math.cos(d.rotate * cloudRadians),
				wcr = w * cr,
				wsr = w * sr,
				hcr = h * cr,
				hsr = h * sr;
			w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
			h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
		} else {
			w = (w + 0x1f) >> 5 << 5;
		}
		if (h > maxh) maxh = h;
		if (x + w >= (cw << 5)) {
			x = 0;
			y += maxh;
			maxh = 0;
		}
		if (y + h >= ch) break;
		c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
		if (d.rotate) c.rotate(d.rotate * cloudRadians);
		c.fillText(d.text, 0, 0);
		if (d.padding) c.lineWidth = 2 * d.padding, c.strokeText(d.text, 0, 0);
		c.restore();
		d.width = w;
		d.height = h;
		d.xoff = x;
		d.yoff = y;
		d.x1 = w >> 1;
		d.y1 = h >> 1;
		d.x0 = -d.x1;
		d.y0 = -d.y1;
		d.hasText = true;
		x += w;
	}
	var pixels = c.getImageData(0, 0, (cw << 5) / ratio, ch / ratio).data,
		sprite = [];
	while (--di >= 0) {
		d = data[di];
		if (!d.hasText) continue;
		var w = d.width,
			w32 = w >> 5,
			h = d.y1 - d.y0;
		// Zero the buffer
		for (var i = 0; i < h * w32; i++) sprite[i] = 0;
		x = d.xoff;
		if (x == null) return;
		y = d.yoff;
		var seen = 0,
			seenRow = -1;
		for (var j = 0; j < h; j++) {
			for (var i = 0; i < w; i++) {
				var k = w32 * j + (i >> 5),
					m = pixels[((y + j) * (cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
				sprite[k] |= m;
				seen |= m;
			}
			if (seen) seenRow = j;
			else {
				d.y0++;
				h--;
				j--;
				y++;
			}
		}
		d.y1 = d.y0 + seenRow;
		d.sprite = sprite.slice(0, (d.y1 - d.y0) * w32);
	}
}

// Use mask-based collision detection.
function cloudCollide(tag, board, sw) {
	sw >>= 5;
	var sprite = tag.sprite,
		w = tag.width >> 5,
		lx = tag.x - (w << 4),
		sx = lx & 0x7f,
		msx = 32 - sx,
		h = tag.y1 - tag.y0,
		x = (tag.y + tag.y0) * sw + (lx >> 5),
		last;
	for (var j = 0; j < h; j++) {
		last = 0;
		for (var i = 0; i <= w; i++) {
			if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0))
				& board[x + i]) return true;
		}
		x += sw;
	}
	return false;
}

function cloudBounds(bounds, d) {
	var b0 = bounds[0],
		b1 = bounds[1];
	if (d.x + d.x0 < b0.x) b0.x = d.x + d.x0;
	if (d.y + d.y0 < b0.y) b0.y = d.y + d.y0;
	if (d.x + d.x1 > b1.x) b1.x = d.x + d.x1;
	if (d.y + d.y1 > b1.y) b1.y = d.y + d.y1;
}

function collideRects(a, b) {
	return a.x + a.x1 > b[0].x && a.x + a.x0 < b[1].x && a.y + a.y1 > b[0].y && a.y + a.y0 < b[1].y;
}

function archimedeanSpiral(size) {
	var e = size[0] / size[1];
	return function (t) {
		return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
	};
}

function rectangularSpiral(size) {
	var dy = 4,
		dx = dy * size[0] / size[1],
		x = 0,
		y = 0;
	return function (t) {
		var sign = t < 0 ? -1 : 1;
		// See triangular numbers: T_n = n * (n + 1) / 2.
		switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
			case 0: x += dx; break;
			case 1: y += dy; break;
			case 2: x -= dx; break;
			default: y -= dy; break;
		}
		return [x, y];
	};
}

// TODO reuse arrays?
function zeroArray(n) {
	var a = [],
		i = -1;
	while (++i < n) a[i] = 0;
	return a;
}

var cloudRadians = Math.PI / 180,
	cw = 1 << 11 >> 5,
	ch = 1 << 11,
	canvas,
	ratio = 1;

if (typeof document !== "undefined") {
	canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	ratio = Math.sqrt(canvas.getContext("2d").getImageData(0, 0, 1, 1).data.length >> 2);
	canvas.width = (cw << 5) / ratio;
	canvas.height = ch / ratio;
} else {
	// node-canvas support
	var Canvas = require("canvas");
	canvas = new Canvas(cw << 5, ch);
}

var c = canvas.getContext("2d"),
	spirals = {
		archimedean: archimedeanSpiral,
		rectangular: rectangularSpiral
	};
c.fillStyle = c.strokeStyle = "red";
c.textAlign = "center";

//     exports.cloud = cloud;
// })(typeof exports === "undefined" ? d3.layout || (d3.layout = {}) : exports);
