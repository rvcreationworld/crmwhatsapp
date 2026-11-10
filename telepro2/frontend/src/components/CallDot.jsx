import React from 'react';

function CallDot({ type }) {
  if (!type) return <span className="call-dot-empty" />;

  const classNameMap = {
    NOT_CALLED: "call-dot call-dot-red",
    ZERO_CALL_1: "call-dot call-dot-green",
    ZERO_CALL_2: "call-dot call-dot-green",
    ZERO_CALL_3_PLUS: "call-dot call-dot-green",
    CONNECTED: "call-dot call-dot-green",
  };

  const titleMap = {
    NOT_CALLED: "Call not done",
    ZERO_CALL_1: "Call done",
    ZERO_CALL_2: "Call done",
    ZERO_CALL_3_PLUS: "Call done",
    CONNECTED: "Call connected",
  };

  return (
    <span
      className={classNameMap[type] || "call-dot-empty"}
      title={titleMap[type] || ""}
    />
  );
}

export default CallDot;
