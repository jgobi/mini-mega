import logo from '../logo.svg';

export default function HomePage() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Welcome to Mini Cloud!
        </p>
        {/* <a
          className="App-link"
          href="/download/linux-client#filekey"
        >
          Download client for Linux
        </a>
        <a
          className="App-link"
          href="/download/win32-client#filekey"
          rel="noopener noreferrer"
        >
          Download client for Windows
        </a> */}
      </header>
    </div>
  );
}
