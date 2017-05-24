const assert = require('chai').assert;
const expect = require('chai').expect;
//--------------------------------------------

let dataCache = {action: 1, cooking: 4, crime: 2, mystery: 5, reality: 6, sitcom: 3, suspense: 2, travel: 3};
let data = [{category: 'action', count: 4}, {category: 'cooking', count: 4}, {category: 'crime', count: 5}, {category: 'mystery', count: 5}, {category: 'reality', count: 9}, {category: 'sitcom', count: 3}, {category: 'travel', count: 3}, {category: 'suspense', count: 2} ];

//-------------------
describe('diffData', () => {
  
  it('should return true if needs to be changed', () => {
    let needsChange = false;
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].count !== dataCache[data[i].category]) {
          needsChange = true;
          dataCache[data[i].category] = data[i].count;
        }
      }
    assert.isTrue(needsChange, 'true: it does need to be changed');
  });

});