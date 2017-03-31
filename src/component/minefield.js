import Cell from "./cell";
import React from "react";
class Minefield extends React.Component {
  constructor(){
    super();
    this.onCellClick = this.onCellClick.bind(this); 
  };
  onCellClick(x, y, e){
    alert(x + "-" + y);
  };
  render() {
    var dimension = {width: 30, height: 16};
    if (this.props.dimension) {
      if (this.props.dimension.width != undefined) {
        dimension.width = this.props.dimension.width;
      }
      if (this.props.dimension.height != undefined) {
        dimension.height = this.props.dimension.height;
      }
    }
    var minefield = [];
    var rowStyle = {height: 45};
    for (var i = 0; i < dimension.height; ++i) {
      var row = [];
      for (var j = 0; j < dimension.width; ++j) {
        var key = i +"-" + j;
        var onClick = this.onCellClick.bind(this, j, i);
        row.push(<Cell onClick={onClick} key={key}/>);
      }
      minefield.push(<div style={rowStyle} key={i.toString()}>{row}</div>);
    }
    var minefieldStyle = { left: "50%", 
                           marginLeft: -675, 
                           width: 1350, 
                           top: "50%",
                           marginTop: -360,
                           position: "absolute",
                           height: 720 };
    return (<div style={minefieldStyle} className="minefield">{minefield}</div>);
  };
};
export default Minefield;
