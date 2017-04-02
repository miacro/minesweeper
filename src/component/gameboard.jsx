import React from "react";
import MineMatrix from "../mine-matrix";
import Minefield from "./minefield";
class Gameboard extends React.Component {
  constructor(props){
    super(props);
    var xAxisLength = 30;
    var yAxisLength = 16;
    var mineCount = 99;
    if (this.props.xAxisLength != undefined) {
      xAxisLength = this.props.xAxisLength;
    }
    if (this.props.yAxisLength != undefined) {
      yAxisLength = this.props.yAxisLength;
    }
    if (this.props.mineCount != undefined) {
      mineCount = this.props.mineCount;
    }
    this.state = {};
    this.state.matrix = new MineMatrix({
      xAxisLength: xAxisLength,
      yAxisLength: yAxisLength,
      mineCount: mineCount});
    this.onCellClick = this.onCellClick.bind(this);
  }
  onCellClick(x, y) {
    //this.state.matrix.getMatrix()[y][x].setOpen(true);
    this.state.matrix.openAround(x, y);
    this.setState({matrix: this.state.matrix.duplicate()});
  }
  render() {
    return <Minefield matrix={this.state.matrix} 
                      onCellClick={this.onCellClick}/>;
  }
};

Gameboard.propTypes = {
  xAxisLength: React.PropTypes.number,
  yAxisLength: React.PropTypes.number,
  mineCount: React.PropTypes.number
};
export default Gameboard;
