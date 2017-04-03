import React from "react";
import ReactDOM from "react-dom";
import Component from "./component";
document.oncontextmenu = function(e){
  e.preventDefault();
};
ReactDOM.render(
  <Component.Gameboard />,
  document.getElementById('root')
);
