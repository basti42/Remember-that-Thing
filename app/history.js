document.addEventListener('DOMContentLoaded', (evt)=> {

    /* ~~~~~~~~~~~~~~~~ PRELIMINARYS ~~~~~~~~~~~~~~~~ */



    /* ~~~~~~~~~~~~~~~~ VARIABLES ~~~~~~~~~~~~~~~~ */
    const backdrop = document.querySelector('#backdrop');
    const slider = document.querySelector('#details-slider');
    const statsTotal = document.querySelector('#stats-total');
    const avgTime = document.querySelector('#stats-avg-time');



    /* ~~~~~~~~~~~~~~~~ EVENT-LISTENER ~~~~~~~~~~~~~~~~ */
    backdrop.addEventListener('click', async () => {
        hideOverlay();
    });


    /* ~~~~~~~~~~~~~~~~ METHODS ~~~~~~~~~~~~~~~~ */
    const formatTimePassed = (millisecs) => {
        let secs = (millisecs / 1000).toFixed(0);
        let mins = (secs / 60).toFixed(0);
        let hours = (mins / 60).toFixed(0);
        let days = (hours / 24).toFixed(0);
        return `${days}d ${hours}h ${mins}m ${secs}s`;
    };

    const getTimePassed = (later, earlier) => {
        return later.getTime() - earlier.getTime();
    };

    function showOverlay(){
        backdrop.classList.add('backdrop-show');
        slider.classList.add('show');
    }

    function hideOverlay(){
        slider.classList.remove('show');
        backdrop.classList.remove('backdrop-show');
    }


    const handleResolvedThingClick = async (evt) => {
        let hash = evt.currentTarget.dataset.hash;
        sendToBackend({hash}, 'GETRESOLVEDTASKBYHASH')
            .then(() => { showOverlay(); })
            .catch((err) => { console.error(err); });
    };

    const setResolveDetails = async (task) => {
        document.querySelector('#details-task-header').innerText = task.title;
        // Category = children[2].children[0]
        document.querySelector('#details-task-tag').innerText = task.category;
        // DueDate = children[2].children[1]
        document.querySelector('#details-task-duedate').innerText = task.dueDate.toLocaleDateString();
        // Description = children[1]
        document.querySelector('#details-task-description').innerText = task.description;
        // set hash to the control buttons
        document.querySelector('#details-task-remove').dataset.hash = hash;
        document.querySelector('#details-task-resolve').dataset.hash = hash;
    };
const displayStats = async (tasks) => {
    let total = 0;
    for (let task of tasks){
        total += getTimePassed(task.resolvedat, task.creationDate);
    }
    total /= tasks.length;
    statsTotal.innerText = tasks.length;
    avgTime.innerText = formatTimePassed(total);
};


    const displayResolvedTasks = async (tasks) => {
        let list = document.querySelector('#history-resolved-task-list');
        if (tasks.length <= 0){
            let tmp = document.createElement('li');
            tmp.innerText = "No Resolved Things";
            list.appendChild(tmp);
        } else {
            for (let task of tasks){
                let timepassed = getTimePassed(task.resolvedat, task.creationDate);

                let li = document.createElement('li');
                let div = document.createElement('div');
                div.classList.add('resolved-task-wrapper');
                
                let d1 = document.createElement('div');
                d1.classList.add('resolved-task-wrapper-item');
                let titlelabel = document.createElement('span');
                titlelabel.classList.add('resolved-task-wrapper-item-label')
                titlelabel.innerText = "Title"
                let titlevalue = document.createElement('span');
                titlevalue.innerText = task.title;
                d1.appendChild(titlelabel);
                d1.appendChild(titlevalue);

                let d2 = document.createElement('div');
                d2.classList.add('resolved-task-wrapper-item');
                let timelabel = document.createElement('span');
                timelabel.classList.add('resolved-task-wrapper-item-label')
                timelabel.innerText = "Resolved in";
                let timevalue = document.createElement('span');
                timevalue.innerText = formatTimePassed(timepassed);
                d2.appendChild(timelabel);
                d2.appendChild(timevalue);

                let r1 = document.createElement('div');
                r1.classList.add('resolved-task-wrapper-row');
                r1.appendChild(d1);
                r1.appendChild(d2);

                let d3 = document.createElement('div');
                d3.classList.add('resolved-task-wrapper-item');
                let desclabel = document.createElement('span');
                desclabel.classList.add('resolved-task-wrapper-item-label')
                desclabel.innerText = "Creation Date";
                let descvalue = document.createElement('span');
                descvalue.innerText = task.creationDate.toLocaleDateString();
                d3.appendChild(desclabel);
                d3.appendChild(descvalue);

                let d4 = document.createElement('div');
                d4.classList.add('resolved-task-wrapper-item');
                let duelabel = document.createElement('span');
                duelabel.classList.add('resolved-task-wrapper-item-label')
                duelabel.innerText = "Due Date";
                let duevalue = document.createElement('span');
                duevalue.innerText = task.dueDate.toLocaleDateString();
                d4.appendChild(duelabel);
                d4.appendChild(duevalue);

                let r2 = document.createElement('div');
                r2.classList.add('resolved-task-wrapper-row');
                r2.appendChild(d3);
                r2.appendChild(d4);

                div.appendChild(r1);
                div.appendChild(r2);

                div.dataset.hash = task.hash;
                div.addEventListener('click', handleResolvedThingClick);

                li.appendChild(div);
                list.appendChild(li);
            }
        }
    };


    /* ~~~~~~~~~~~~~~~~ MESSAGING ~~~~~~~~~~~~~~~~ */

    async function sendToBackend(taskObj, request){
        browser.runtime.sendMessage({url: window.location.href, 
                                    request, 
                                    payload: taskObj});
    }

    async function handleResponse(response){
        // console.log("[RESPONSE] ", response);
        if (response.originalrequest === 'GETRESOLVEDTASKS'){
            displayResolvedTasks(response.tasks).then().catch( err => {console.error(err); });
            displayStats(response.tasks).then().catch( err => { console.error(err); });
        } else if (response.originalrequest === 'GETRESOLVEDTASKBYHASH'){
            setResolveDetails(response.task).then().catch( err => {console.error(err); });
        }
    }


    // on page opening, check for active tasks
    sendToBackend({}, 'GETRESOLVEDTASKS')
        .then((obj) => {
            // console.log(obj);
        })
        .catch((err) => {
            console.error(err);
        })

    // Listen for messages from backend
    browser.runtime.onMessage.addListener(handleResponse);
});