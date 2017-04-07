import React from "react";

import MineMatrix from "../mine-matrix";

import Cell from "./cell";

class Minefield extends React.Component {
  constructor() {
    super();
  };
  render() {
    var matrix = this.props.matrix;
    var style = {width: Minefield.style.width, height: Minefield.style.height};
    if (this.props.style) {
      if (this.props.style.width) {
        style.width = this.props.style.width;
      }
      if (this.props.style.height) {
        style.height = this.props.style.height;
      }
    }
    style.cellWidth = style.width / matrix.getXAxisLength();
    style.cellHeight = style.height / matrix.getYAxisLength();
    let minefield = [];
    for (let y = 0; y < matrix.getYAxisLength(); ++y) {
      let row = [];
      for (let x = 0; x < matrix.getXAxisLength(); ++x) {
        var key = x + "-" + y;
        var onClick = this.props.onCellClick.bind(this, x, y);
        var onRightClick = this.props.onCellRightClick.bind(this, x, y);
        var onDoubleClick = this.props.onCellDoubleClick.bind(this, x, y);
        let cellStyle = {
          position: "absolute",
          left: x * style.cellWidth,
          width: style.cellWidth,
          height: style.cellHeight
        };
        var text = matrix.calculateAround(x, y).mine || undefined;
        if (matrix.getMatrix()[y][x].isMine()) {
          text = "*";
        }
        if (!matrix.getMatrix()[y][x].isOpen()) {
          text = "";
        }

        var state = "process";
        if (this.props.error) {
          state = "end";
          if (matrix.getMatrix()[y][x].isMine()) {
            text = "*";
          }
        }

        let elementCell = React.createElement(Cell, {
          style: cellStyle,
          onClick: onClick,
          onRightClick: onRightClick,
          onDoubleClick: onDoubleClick,
          key: key,
          cell: matrix.getMatrix()[y][x],
          state: state
        },
                                              text);
        row.push(elementCell);
      }
      const rowStyle = {
        height: style.cellHeight,
        position: "absolute",
        top: y * style.cellHeight,
        height: style.cellHeight
      };

      let elementRow =
        React.createElement("div", {style: rowStyle, key: y.toString()}, row);
      minefield.push(elementRow);
    }
    var minefieldStyle = {
      left: "50%",
      marginLeft: style.width * -0.5,
      width: style.width,
      top: "50%",
      marginTop: style.height * -0.5,
      position: "absolute",
      height: style.height
    };
    let elementMinefield = React.createElement(
      "div", {style: minefieldStyle, className: "minefield"}, minefield);
    return elementMinefield;
  };
};

Minefield.propTypes = {
  matrix: React.PropTypes.instanceOf(MineMatrix),
  style: React.PropTypes.object,
  onCellClick: React.PropTypes.func,
  onCellRightClick: React.PropTypes.func,
  onCellDoubleClick: React.PropTypes.func
};

Minefield.style = {
  width: 1350,
  height: 720
};
export default Minefield;
