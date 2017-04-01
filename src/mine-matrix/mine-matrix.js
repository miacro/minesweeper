"use strict";
var MineCell = function() {
  this.mine = false;
  this.opened = false;
};

MineCell.prototype.setOpened = function(state) {
  this.opened = true;
  if (state !== undefined) {
    this.opened = state;
  };
  return this.opened;
};

MineCell.prototype.isOpened = function() {
  return this.opened ? true : false;
};

MineCell.prototype.setMine = function(state) {
  this.mine = true;
  if (state !== undefined) {
    this.mine = state;
  };
  return this.mine;
};

MineCell.prototype.isMine = function(state) {
  return this.mine ? true : false;
};

/**
 * @param xAxisLength
 * @param yAxisLength
 * @param mineCount
 */
var MineMatrix = function(params) {
  if (!params.xAxisLength) {
    throw new Error("no xAxisLength");
  }
  if (!params.yAxisLength) {
    throw new Error("no yAxisLength");
  }
  this.matrix = [];
  this.xAxisLength = params.xAxisLength;
  this.yAxisLength = params.yAxisLength;
  for (let y = 0; y < this.yAxisLength; ++y) {
    let row = [];
    for (let x = 0; x < this.xAxisLength; ++x) {
      row.push(new MineCell());
    };
    this.matrix.push(row);
  };
  if (params.mineCount != undefined) {
    this.distributeMines(params.mineCount);
  }
};

MineMatrix.MineCell = MineCell;

MineMatrix.prototype.getMatrix = function() {
  return this.matrix;
};

MineMatrix.prototype.distributeMines = function(count) {
  var random = () => {
    return Math.floor(Math.random() * this.xAxisLength * this.yAxisLength);
  };
  var currentCount = 0;
  var mineMap = {};
  while (currentCount < count) {
    let index = random();
    if (!mineMap[index.toString()]) {
      mineMap[index.toString()] = true;
      currentCount++;
    }
  };

  for (let i in mineMap) {
    const y = Math.floor(i / this.xAxisLength);
    const x = i - this.xAxisLength * y;
    this.matrix[y][x].setMine();
  }
};
MineMatrix.prototype.format = function() {
  var formatString = "";
  for (let y = 0; y < this.yAxisLength; ++y) {
    for (let x = 0; x < this.xAxisLength; ++x) {
      if (this.matrix[y][x].isMine()) {
        formatString += " *";
      } else {
        formatString += " -";
      }
    };
    formatString += "\n";
  };
  return formatString;
};

export default MineMatrix;
