"use strict";
var MineCell = function() {
  this.mine = false;
  this.open = false;
};

MineCell.prototype.setOpen = function(state) {
  this.open = true;
  if (state !== undefined) {
    this.open = state;
  };
  return this.open;
};

MineCell.prototype.isOpen = function() {
  return this.open ? true : false;
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
  this.matrix = [];
  this.xAxisLength = 0;
  this.yAxisLength = 0;
  if (params) {
    this.init(params);
  }
};

MineMatrix.MineCell = MineCell;
MineMatrix.prototype.init = function(params) {
  if (!params.xAxisLength) {
    throw new Error("no xAxisLength");
  }
  if (!params.yAxisLength) {
    throw new Error("no yAxisLength");
  }
  this.xAxisLength = params.xAxisLength;
  this.yAxisLength = params.yAxisLength;
  for (let y = 0; y < this.yAxisLength; ++y) {
    let row = [];
    for (let x = 0; x < this.xAxisLength; ++x) {
      row.push(new MineCell());
    }
    this.matrix.push(row);
  }
  if (params.mineCount != undefined) {
    this.distributeMines(params.mineCount);
  }
};

MineMatrix.prototype.getMatrix = function() {
  return this.matrix;
};
MineMatrix.prototype.setMatrix = function(cellMatrix, xAxisLength,
                                          yAxisLength) {
  this.matrix = cellMatrix;
  if (xAxisLength) {
    this.xAxisLength = xAxisLength;
    this.yAxisLength = yAxisLength;
  }
  return this.matrix;
};

MineMatrix.prototype.getXAxisLength = function() {
  return this.xAxisLength;
};
MineMatrix.prototype.getYAxisLength = function() {
  return this.yAxisLength;
};

MineMatrix.prototype.duplicate = function(other) {
  if (other === undefined) {
    other = new MineMatrix();
  }
  other.setMatrix(this.getMatrix(), this.xAxisLength, this.yAxisLength);
  return other;
};

MineMatrix.prototype.calculateAround = function(x, y) {
  var countYAxis = (x) => {
    var count = 0;
    if (this.matrix[y][x].isMine()) {
      count++;
    }
    if (y > 0 && this.matrix[y - 1][x].isMine()) {
      count++;
    }
    if (y < (this.yAxisLength - 1) && this.matrix[y + 1][x].isMine()) {
      count++;
    }
    return count;
  };
  var count = 0;
  if (x > 0) {
    count += countYAxis(x - 1);
  }
  count += countYAxis(x);
  if (x < (this.xAxisLength - 1)) {
    count += countYAxis(x + 1);
  }
  return count;
};

MineMatrix.prototype.openBlank = function(x, y) {
  var openBlank = (x, y) => {
    if (x < 0 || x >= this.xAxisLength) {
      return;
    }
    if (y < 0 || y >= this.yAxisLength) {
      return;
    }
    if (this.matrix[y][x].isOpen()) {
      return;
    }
    if (this.matrix[y][x].isMine()) {
      return;
    }
    this.matrix[y][x].setOpen(true);

    if (this.calculateAround(x, y) > 0) {
      return;
    }
    openBlank(x - 1, y);
    openBlank(x - 1, y - 1);
    openBlank(x - 1, y + 1);
    openBlank(x, y - 1);
    openBlank(x, y + 1);
    openBlank(x + 1, y);
    openBlank(x + 1, y - 1);
    openBlank(x + 1, y + 1);
  };
  return openBlank(x, y);
};

MineMatrix.prototype.openAround = function(x, y){

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
  }

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
    }
    formatString += "\n";
  }
  return formatString;
};

export default MineMatrix;
