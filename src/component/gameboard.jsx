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
    this.onCellRightClick = this.onCellRightClick.bind(this);
    this.onCellDoubleClick = this.onCellDoubleClick.bind(this);
  }
  onCellClick(x, y) {
    this.state.matrix.openBlank(x, y);
    this.setState({matrix: this.state.matrix.duplicate()});
  }
  onCellDoubleClick(x, y) {
    this.state.matrix.openAround(x, y);
    this.setState({matrix: this.state.matrix.duplicate()});
  }
  onCellRightClick(x, y) {
    this.state.matrix.getMatrix()[y][x].setFlag(
      !this.state.matrix.getMatrix()[y][x].isFlag());
    this.setState({matrix: this.state.matrix.duplicate()});
  }
  render() {
  const style = {width: 1350, height: 720};
    return <Minefield matrix={this.state.matrix} 
                      onCellClick={this.onCellClick}
                      style={style}
                      onCellRightClick={this.onCellRightClick}
                      onCellDoubleClick={this.onCellDoubleClick}/>;
  }
};

Gameboard.propTypes = {
  xAxisLength: React.PropTypes.number,
  yAxisLength: React.PropTypes.number,
  mineCount: React.PropTypes.number
};
export default Gameboard;
