import React, { useEffect, useState } from 'react';
import { readableSize } from '../helpers/numbers';

export default function DownloadPage(props) {
  let [loading, setLoading] = useState(true);
  let [name, setName] = useState('');
  let [size, setSize] = useState(0);

  let [loadProgress, setLoadProgress] = useState(0);
  let [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    let i = 0;
    let a = setInterval(() => {
      setLoadProgress(++i);
    }, 20);
    setTimeout(() => {
      clearInterval(a);
      setName('awfice.html');
      setSize(3245);
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {loading ? (
          <>
            <p>Aguarde...</p>
            <progress type="progress" max="100" value={loadProgress} />
          </>
        ) : (
          <>
          <p>{name} ({readableSize(size)})</p>
          <button onClick={a => alert('baixou!')}>Download</button>
          <progress type="progress" max="100" value={downloadProgress} />
          </>
        )}
      </header>
    </div>
  );
}
