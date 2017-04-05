import React from "react";
import extend from "extend";
import MineMatrix from "../mine-matrix";
class Cell extends React.Component {
  constructor(props) {
    super(props);
    this.onMouseDown = this.onMouseDown.bind(this);
  };
  onMouseDown(e) {
    if (e.button == 2) {
      return this.props.onRightClick(e);
    }

    if (e.button == 0) {
      return this.props.onClick(e);
    }
  }
  getStyle(state, cell) {
    const defaultStyle = {
      closed: {
        background : "rgba(13, 29, 74, 0.921569)",
        borderRadius: 4,
        border: "1px solid rgb(11, 2, 35)",
        boxShadow: "inset 0 0 4px 4px rgb(23, 93, 51)",
        width: 45,
        height: 45
      },
      open: {
        background : "rgb(181, 187, 206)",
        borderRadius: 4,
        border: "1px solid rgb(11, 2, 35)",
        boxShadow: "inset 0 0 4px 4px rgb(225, 227, 234)",
        width: 45,
        height: 45
      }
    };

    var style = {};
    if (cell.isOpen()) {
      style = extend(style, defaultStyle.open);
      if (state == "process") {
      } else if (state == "end") {
        style.background = "rgb(180, 180, 180)";
      } 
    } else {
      style = extend(style, defaultStyle.closed);
      let center = {x : style.width / 2, y: style.height / 2};
      style.background = "radial-gradient(at " + center.x + "px " + center.y 
                            + "px , rgb(101, 210, 145), rgb(61, 140, 93), rgb(16, 35, 24))";
      if (state == "process") {
      } else {
        style.background = ""
      }
    } 
    if (cell.isFlag()) {
      style.background = "rgb(255, 129, 0)";
    }
    style.fontSize = style.height * 2 / 3;
    return style;
  } 
  render() {
    var state = "open";
    var style = this.getStyle(this.props.state, this.props.cell);
    style = extend(style, this.props.style);
    return (
      <button className = "cell"
              style = {style}
              onClick = {this.onClick}
              onMouseDown = {this.onMouseDown}
              onDoubleClick = {this.props.onDoubleClick}>
        {this.props.children}
      </button>);
  };
};

Cell.defaultProps = {
};
Cell.propTypes = {
  state: React.PropTypes.string,
  style: React.PropTypes.object,
  cell: React.PropTypes.instanceOf(MineMatrix.MineCell).isRequired,
  onClick: React.PropTypes.func,
  onDoubleClick: React.PropTypes.func,
  onRightClick: React.PropTypes.func
};
export default Cell;
