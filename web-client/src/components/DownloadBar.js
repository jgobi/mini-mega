import { useEffect, useState } from 'react'

export default function DownloadBar(props) {
    let [sInicio, setSInicio] = useState(0);
    
    useEffect(() => {
        setState(props.value);
    }, [props.max]);

    useEffect(() => {
    if(!updateTimer.current) {
        setUpdate();
    }
    }, [props.value]);

    return (
        <>
        <progress max={props.max} value={props.value}></progress>
        <br />
        
        </>
    )
}