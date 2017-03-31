"use strict";
var MineCell = function() {
  this.isMine = false;
  this.isOpened = false;
};
var MineMatrix = function(width, height, mineCount) {
  this.matrix = [];
  this.width = width;
  this.height = height;
  for (var i = 0; i < this.height; ++i) {
    var row = [];
    for (var j = 0; j < this.width; ++j) {
      row.push(new MineCell());
    };
    this.matrix.push(row);
  };
};

MineMatrix.prototype.distributeMines = function(count) {
  var totalCount = this.width * this.height;

};
export default MineMatrix;
