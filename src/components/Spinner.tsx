import styles from '../app/styles/Spinner.module.css';

const Spinner = () => {
    return (
      <div className="flex justify-center items-center h-16">
        <div className={`${styles.loader} ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12`}></div>
      </div>
    );
  };
  
  export default Spinner;