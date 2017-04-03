import Cell from "./cell";
import React from "react";
import MineMatrix from "../mine-matrix";
class Minefield extends React.Component {
  constructor(){
    super();
  };
  render() {
    var matrix = this.props.matrix;
    let minefield = [];
    for (let y = 0; y < matrix.getYAxisLength(); ++y) {
      let row = [];
      for (let x = 0; x < matrix.getXAxisLength(); ++x) {
        var key = x +"-" + y;
        var onClick = this.props.onCellClick.bind(this, x, y);
        var onDoubleClick = this.props.onCellDoubleClick.bind(this, x, y);
        var text;
        if(matrix.getMatrix()[y][x].isMine()){
          text  = "*";
        } else {
          text = matrix.calculateAround(x, y);
        }
        if (! matrix.getMatrix()[y][x].isOpen() || text === 0) {
          text = ""; 
        }
        var state = "open";
        if(matrix.getMatrix()[y][x].isOpen()){
         state = "closed";
        }
        const cellStyle = {position: "absolute", left: x * 45};
        row.push(<Cell style={cellStyle} 
                       onClick={onClick} 
                       onDoubleClick={onDoubleClick} 
                       key={key} 
                       state={state}>
                   {text}
                 </Cell>);
      }
      const rowStyle = {height: 45, position: "absolute", top: y * 45};
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

Minefield.propTypes = {
  matrix: React.PropTypes.instanceOf(MineMatrix),
  onCellClick: React.PropTypes.func,
  onCellDoubleClick: React.PropTypes.func
};
export default Minefield;
