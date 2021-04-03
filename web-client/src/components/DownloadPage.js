import React from 'react';
import { Buffer } from 'safe-buffer';
import { readableSize } from '../helpers/readableSize';
import { decryptInfo } from '../helpers/decrypt';
import { deobfuscateFileKey } from '../helpers/keys';
import { decodeInfoFileV2 } from '../helpers/infoFile';

import movingAverage from 'moving-average';

const API_BASE = 'https://minicloud.ga/api';

export default class DownloadPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: '',
      started: 0,
      name: '',
      size: 0,
      loadProgress: 0,
      downloadProgress: 0,
      speed: 0,
      url: '',
    };
  }

  componentDidMount() {
    let fileKeyProp = this.props.fileKey;
    let obfuscatedFileKey;
    if (!fileKeyProp) {
      fileKeyProp = prompt('Please enter the file key:');
      if (!fileKeyProp) {
        return this.setState({
          loading: false,
          error: 'File key not provided.'
        })
      }
    }
    try {
      obfuscatedFileKey = Buffer.from(fileKeyProp, 'base64');
      console.log(fileKeyProp, obfuscatedFileKey)
      if (obfuscatedFileKey.length !== 32) throw new Error('Invalid file key size.');
    } catch (err) {
      return this.setState({
        loading: false,
        error: 'Invalid file key.'
      })
    }
    fetch(API_BASE + '/file/info/' + this.props.fileHandler)
      .then((r) => {
        if (r.ok) return r.arrayBuffer();
        if (r.status === 404)
          return Promise.reject(new Error('File Not Found'));
        return Promise.reject(new Error('Network Error'));
      })
      .then((blob) => {
        const { key, nonce } = deobfuscateFileKey(obfuscatedFileKey);
        let info;
        try {
          info = decodeInfoFileV2(decryptInfo(Buffer.from(blob), key));
        } catch (err) {
          return this.setState({
            loading: false,
            error: 'This file cannot be download by a browser, please use the CLI client.',
          });
        }
        this.setState({
          name: info.fileName,
          size: info.fileSize,
          loading: false,
        });
        let m = 0, l=0;
        navigator.serviceWorker.ready.then(registration => {
          const sw = registration.active;
          
          let prog = movingAverage(5000);
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'link' && event.data.info.fileHandler === this.props.fileHandler) {
              this.setState({
                url: event.data.info.fakeUrl,
              });
            }
            if (event.data && event.data.type === 'progress' && event.data.fileHandler === this.props.fileHandler) {
              if (l) {
                m = ((m + event.data.timestamp - l) / 2);
              }
              l=event.data.timestamp;
              this.setState((state) => {
                prog.push(event.data.timestamp, event.data.progress);
                return {
                  downloadProgress: state.downloadProgress + event.data.progress,
                  speed: m ? prog.movingAverage()*(1000/m) : 0,
                };
              })
            }
          });

          sw.postMessage({
            type: 'info',
            info: {
              ...info,
              fileHandler: this.props.fileHandler,
              fileKey: key,
              fileNonce: nonce,
              fileUrl: API_BASE + '/file/download/' + this.props.fileHandler
            },
          });
        })
      })
      .catch((err) => {
        console.error(err);
        this.setState({
          loading: false,
          error: 'Error obtaining file info: ' + err.message
        });
      });
  }

  cancel () {
    navigator.serviceWorker.ready.then(registration => {
      const sw = registration.active;
      sw.postMessage({
        type: 'abort',
        fakeUrl: this.state.url,
      });
      this.setState({
        error: 'Download aborted by the user.'
      })
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          {this.state.loading ? (
            <>
              <p>Aguarde...</p>
              <progress />
            </>
          ) : this.state.error ? (
            <>
            <h1>Error</h1>
            <p>{this.state.error}</p>
            </>
          ) : (
            <>
              <p>
                {this.state.name} ({readableSize(this.state.size)})
              </p>
              {this.state.started ? (
                <button onClick={this.cancel.bind(this)}>Cancel</button>
              ) : (
                <a className="button" href={this.state.url} onClick={() => this.setState({ started: true })}>Download</a>
              )}
              <progress
                max={this.state.size}
                value={this.state.downloadProgress}
              />
              <p>
                {Math.floor(
                  (this.state.downloadProgress * 100) / this.state.size
                )}
                %<br />(
                {readableSize(Math.floor(this.state.speed))}
                /s)
              </p>
            </>
          )}
        </header>
      </div>
    );
  }
}
