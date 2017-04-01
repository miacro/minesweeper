import Cell from "./cell";
import React from "react";
import MineMatrix from "../mine-matrix";
class Minefield extends React.Component {
  constructor(){
    super();
  };
  render() {
    var dimension = {xAxisLength: 30, yAxisLength: 16};
    if (this.props.dimension) {
      if (this.props.dimension.xAxisLength != undefined) {
        dimension.xAxisLength = this.props.dimension.xAxisLength;
      }
      if (this.props.dimension.yAxisLength != undefined) {
        dimension.yAxisLength = this.props.dimension.yAxisLength;
      }
    }
    var mineMatrix = new MineMatrix({xAxisLength: dimension.xAxisLength,
                                     yAxisLength: dimension.yAxisLength,
                                     mineCount: 99});
    var matrix = mineMatrix.getMatrix();
    var onCellClick = (x, y)=>{
      alert("("+x+","+y+")--" + matrix[y][x].isMine());
    };
    let minefield = [];
    for (let y = 0; y < dimension.yAxisLength; ++y) {
      let row = [];
      for (let x = 0; x < dimension.xAxisLength; ++x) {
        var key = x +"-" + y;
        var onClick = onCellClick.bind(this, x, y);
        var text = matrix[y][x].isMine() ? "*" : "0";
        var state = "open";
        if(matrix[y][x].isMine()){
         state = "closed";
        }
        row.push(<Cell onClick={onClick} key={key} text={text} state={state}/>);
      }
      const rowStyle = {height: 45};
      minefield.push(<div style={rowStyle} key={y.toString()}>{row}</div>);
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
