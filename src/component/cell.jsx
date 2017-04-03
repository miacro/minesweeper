import React from "react";
import extend from "extend";
class Cell extends React.Component {
  constructor(props) {
    super(props);
    this.onMouseDown = this.onMouseDown.bind(this);
  };
  onMouseDown(e) {
    if (e.button == 2) {
      return this.props.onRightClick(e);
    }
  }
  render() {
    var state = "open";
    if (this.props.state == "closed"){
      state = this.props.state;
    }
    var style = {};
    style = extend(style, Cell.defaultProps.style);
    if (state == "open") {
      style = extend(style, Cell.style.open);
    } else {
      style = extend(style, Cell.style.closed);
    }
    if (this.props.style){
      style = extend(style, this.props.style);
    }
    style.fontSize = style.height * 2 / 3;
    return (
      <button className = "cell"
              style = {style}
              onClick = {this.props.onClick}
              onMouseDown = {this.onMouseDown}
              onDoubleClick = {this.props.onDoubleClick}>
        {this.props.children}
      </button>);
  };
};

Cell.style = {
  open: {
    backgroundColor : "rgba(13, 29, 74, 0.921569)",
    borderRadius: 4,
    border: "1px solid rgb(11, 2, 35)",
    boxShadow: "inset 0 0 4px 4px rgb(10, 5, 47)",
    fontSize: 32,
    padding: 0,
    margin: 0,
    textAlign: "center",
    width: 45,
    height: 45
  },
  closed: {
    backgroundColor : "rgb(181, 187, 206)",
    borderRadius: 4,
    border: "1px solid rgb(11, 2, 35)",
    boxShadow: "inset 0 0 4px 4px rgb(225, 227, 234)",
    fontSize: 32,
    padding: 0,
    margin: 0,
    textAlign: "center",
    width: 45,
    height: 45
  }
};

Cell.defaultProps = {
};
Cell.propTypes = {
  style: React.PropTypes.object,
  state: React.PropTypes.string,
  text: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.number,
    React.PropTypes.bool]),
  onClick: React.PropTypes.func,
  onDoubleClick: React.PropTypes.func,
  onRightClick: React.PropTypes.func
};
export default Cell;
