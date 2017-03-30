class MineMatrix {
  constructor(width, height, mineCount) {
    this.matrix = [];
    for (var i = 0; i < height; ++i) {
      var row = [];
      for (var j = 0; j < width; ++j) {
        row.push(false);
      }
      this.matrix.push(row);
    }
    var totalCount = width * height;
  
  };

};
export default MineMatrix;
