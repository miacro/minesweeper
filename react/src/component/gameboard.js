import React from "react";
import MineMatrix from "../mine-matrix";
import Minefield from "./minefield";
import TextCell from "./text-cell";
class Gameboard extends React.Component {
  constructor(props) {
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
    this.state.error = false;
    this.state.matrix = new MineMatrix({
      xAxisLength: xAxisLength,
      yAxisLength: yAxisLength,
      mineCount: mineCount
    });
    this.onCellClick = this.onCellClick.bind(this);
    this.onCellRightClick = this.onCellRightClick.bind(this);
    this.onCellDoubleClick = this.onCellDoubleClick.bind(this);
  }
  onCellClick(x, y, e) {
    console.log(this.state.matrix.getMatrix()[y][x]);
    if (!this.state.error) {
      var result = this.state.matrix.openCell(x, y);
      this.setState(
        {matrix: this.state.matrix.duplicate(), error: result.error});
    }
    e.preventDefault();
  }
  onCellDoubleClick(x, y, e) {
    e.preventDefault();
    if (!this.state.error) {
      var result = this.state.matrix.openAround(x, y);
      this.setState(
        {matrix: this.state.matrix.duplicate(), error: result.error});
    }
  }
  onCellRightClick(x, y, e) {
    if (!this.state.error) {
      this.state.matrix.getMatrix()[y][x].setFlag(
        !this.state.matrix.getMatrix()[y][x].isFlag());
      this.setState({matrix: this.state.matrix.duplicate()});
    }
    e.preventDefault();
  }
  render() {
    const style = {width: 1350, height: 720};
    var elementMinefield = React.createElement(Minefield, {
      matrix: this.state.matrix,
      onCellClick: this.onCellClick,
      style: style,
      key: "minefield",
      error: this.state.error,
      onCellRightClick: this.onCellRightClick,
      onCellDoubleClick: this.onCellDoubleClick
    },
                                               null);
    // var elementTimer = React.createElement(TextCell, {key: "timer"}, "1");
    return React.createElement("div", null, [elementMinefield]);
  }
};

Gameboard.propTypes = {
  xAxisLength: React.PropTypes.number,
  yAxisLength: React.PropTypes.number,
  mineCount: React.PropTypes.number
};
export default Gameboard;
