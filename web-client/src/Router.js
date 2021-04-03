import DownloadPage from './components/DownloadPage';
import HomePage from './components/HomePage';

export default function Router() {
  let path = document.location.pathname;
  if (path.startsWith('/download/')) { // download file
    let fileHandler = path.substr(10);
    let fileKey = document.location.hash.substr(1);
    if (fileHandler) {
      return (
        <DownloadPage fileHandler={fileHandler} fileKey={fileKey} />
      );
    }
  }
  
  if (path !== '/') {  // 404
    window.history.replaceState(null, null, '/');
  }

  return (
    <HomePage />
  );
}
