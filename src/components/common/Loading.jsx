import './Loading.css';

const Loading = ({ fullScreen = false, size = 'medium', text = '' }) => {
    if (fullScreen) {
        return (
            <div className="loading-overlay">
                <div className="loader"></div>
                {text && <p className="loading-text">{text}</p>}
            </div>
        );
    }

    return (
        <div className={`loading-container ${size}`}>
            <div className={`loader ${size}`}></div>
            {text && <p className="loading-text">{text}</p>}
        </div>
    );
};

export default Loading;
