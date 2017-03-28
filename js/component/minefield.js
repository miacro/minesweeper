class Minefield extends React.Component {
  constructor(){
    super();
    this.onCellClick = this.onCellClick.bind(this); 
  };
  onCellClick(e){
    console.log(e.target.value);
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
    var columns = [];
    for (var i = 0; i < dimension.height; ++i) {
      var row = [];
      for (var j = 0; j < dimension.width; ++j) {
        var key = i +"-" + j;
        row.push(<Cell onClick={this.onCellClick} key={key}/>);
      }
      columns.push(<div key={i.toString()}>{row}</div>);
    }
    return (<div>{columns}</div>);
  };
};
