import React from "react";
import extend from "extend";
class Cell extends React.Component {
  render() {
    var state = "open";
    if (this.props.state == "closed"){
      state = this.props.state;
    }
    var style = {};
    if (state == "open") {
      style.backgroundColor = "rgba(17, 45, 13, 0.92)";
    } else {
      style.backgroundColor = "rgba(245, 245, 245, 0.921569)";
    }
    if (this.props.style){
      style = extend(style, this.props.style);
    }
    return (
      <button className = "cell"
              style = {style}
              onClick = {this.props.onClick}>
        {this.props.text}
      </button>);
  };
};

Cell.defaultProps = {
  style: {
    backgroundColor : "rgba(17, 45, 13, 0.92)",
    borderRadius: 4,
    border: "1px solid #333",
    boxShadow: "inset 0 0 5px 5px #ccc",
    fontSize: 32,
    padding: 7,
    margin: 0,
    textAlign: "center",
    width: 45,
    height: 45
  }
};
Cell.propTypes = {
  style: React.PropTypes.object,
  state: React.PropTypes.string,
  text: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.number,
    React.PropTypes.bool]),
  onClick: React.PropTypes.func
};
export default Cell;
