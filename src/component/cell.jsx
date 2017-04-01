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
      style = {
        borderRadius: 4,
        border: "1px solid #333",
        boxShadow: "inset 0 0 5px 5px #ccc"
      };
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
export default Cell;
