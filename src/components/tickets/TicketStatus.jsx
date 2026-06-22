function TicketStatus({ status = "valid" }) {
  return <span className={`ticket-validity ticket-validity--${status}`}><i />{status === "valid" ? "Ready for entry" : status}</span>;
}

export default TicketStatus;
