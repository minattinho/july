import React from "react";
import "./LoadingScreen.css";

export default function LoadingScreen({
  message = "Carregando...",
  error = null,
}) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        {!error ? (
          <>
            {" "}
            <div
              className="loading-spinner"
              data-testid="loading-spinner"
            ></div>{" "}
            <p className="loading-message">{message}</p>{" "}
          </>
        ) : (
          <div className="loading-error">
            <div className="error-icon">!</div>
            <h2>Erro</h2>
            <p>{error}</p>
            <p>Tente recarregar a página</p>
            <button onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        )}
      </div>
    </div>
  );
}
