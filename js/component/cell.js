class Cell extends React.Component {
  render() {
        return (
          <button className = "cell"
                  style = {this.props.style}
                  onClick = {this.props.onClick} />);
    };
};
