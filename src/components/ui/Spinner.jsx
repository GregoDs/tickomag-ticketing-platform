import "./Spinner.css";

function Spinner({ label = "Loading" }) {
  return <span className="ui-spinner" role="status"><i aria-hidden="true" /><span>{label}</span></span>;
}

export default Spinner;
