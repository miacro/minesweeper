import extend from "extend";
import React from "react";

class TextCell extends React.Component {
  constructor(props) {
    super(props);
  };
  render() {
    return React.createElement("button", {className: "textcell"},
                               this.props.children);
  };
};

TextCell.defaultProps = {};
TextCell.propTypes = {};
export default TextCell;
