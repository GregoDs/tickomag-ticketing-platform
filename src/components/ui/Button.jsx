import { Link } from "react-router-dom";
import "./Button.css";

function Button({ children, className = "", to, variant = "default", ...props }) {
  const classes = `ui-button ui-button--${variant} ${className}`.trim();
  if (to) return <Link className={classes} to={to} {...props}>{children}</Link>;
  return <button className={classes} type="button" {...props}>{children}</button>;
}

export default Button;
