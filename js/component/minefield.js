class Minefield extends React.Component {
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
        row.push(<Cell />);
      }
      columns.push(<div>{row}</div>);
    }
    return (<div>{columns}</div>);
  };
};
