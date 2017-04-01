import React from "react";
import MineMatrix from "../mine-matrix";
import Minefield from "./minefield";
class Gameboard extends React.Component {
  constructor(){
    super();
  }
  render() {
    var xAxisLength = 30;
    var yAxisLength = 16;
    if (this.props.xAxisLength != undefined) {
      xAxisLength = this.props.xAxisLength;
    }
    if (this.props.yAxisLength != undefined) {
      yAxisLength = this.props.yAxisLength;
    }
    var matrix = new MineMatrix({xAxisLength: xAxisLength,
                                 yAxisLength: yAxisLength,
                                 mineCount: 99});
   var onCellClick = (x, y)=> {
      matrix.getMatrix()[y][x].setOpen(true);
    };
    return <Minefield matrix={matrix} onCellClick={onCellClick}/>;
  }
};

Gameboard.propTypes = {
  xAxisLength: React.PropTypes.number,
  yAxisLength: React.PropTypes.number
};
export default Gameboard;
