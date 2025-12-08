export default function getDate(){
    const currentDate = new Date();
    const convert_to_week_day = (date) => {
        switch(date % 10){
            case 1:
                return `${date}st`
            case 2:
                return `${date}nd`
            case 3:
                return `${date}rd`
            default:
                return `${date}th`
        };
    }; 
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsOfYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var dateFormMessage = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`
    var message = `Today is ${daysOfWeek[currentDate.getDay()]}, ${convert_to_week_day(currentDate.getDate())} of ${monthsOfYear[currentDate.getMonth()]} ${currentDate.getFullYear()} (${dateFormMessage})`;
    return message;
};