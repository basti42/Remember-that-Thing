document.addEventListener('DOMContentLoaded', (evt)=> {

    /* ~~~~~~~~~~~~~~~~ PRELIMINARYS ~~~~~~~~~~~~~~~~ */
    const setInitialDate = () => {
        try {
            let now = new Date();   // set tomorrow's date as due date
            let day = ("0" + (now.getDate()+1)).slice(-2);
            let month = ("0" + (now.getMonth() + 1)).slice(-2);
            let today = now.getFullYear()+"-"+(month)+"-"+(day) ;
            document.querySelector('#input-task-duedate').value = today;
        } catch (e) {
            console.log("[INFO] Unable to set initial due date!");
        }
    };
    setInitialDate();


    /* ~~~~~~~~~~~~~~~~ VARIABLES ~~~~~~~~~~~~~~~~ */
    const addTaskButton = document.querySelector('#add-task-button');
    const backdrop = document.querySelector('#backdrop');
    const slider = document.querySelector('#slider');
    const detailsSlider = document.querySelector('#details-slider');
    const saveTaskButton = document.querySelector('#input-task-submit');
    const contentRow = document.querySelector('.content-row-wrapper');
    const content = document.querySelector('.content-wrapper');
    const deleteButton = document.querySelector('#details-task-remove');
    const resolveButton = document.querySelector('#details-task-resolve');
    const creditsButton = document.querySelector('div.footer-item > span');
    const modal = document.querySelector('#modal');
    const closeModalButton = document.querySelector('#close-modal-button');
    const searchInput = document.querySelector('#search-input');
    const searchIcon = document.querySelector('#search-icon');



    /* ~~~~~~~~~~~~~~~~ EVENT-LISTENER ~~~~~~~~~~~~~~~~ */
    const onkeypressfunction = async(evt) => {
        if (110 === evt.keyCode){ // n = 110
            showOverlay();
        }
    };

    document.onkeypress = onkeypressfunction;

    addTaskButton.addEventListener('click', (evt) => {
        evt.preventDefault();
        let target = evt.target;
        showOverlay();
    });

    backdrop.addEventListener('click', (evt) => {
        evt.preventDefault();
        hideOverlay();
        hideDetailsOverlay();
        hideModal();
    });

    creditsButton.addEventListener('click', async (evt) => {
        evt.preventDefault();
        showModal();
    });

    closeModalButton.addEventListener('click', async (evt) => {
        evt.preventDefault();
        hideModal();
    })

    saveTaskButton.addEventListener('click', async (evt) => {
        getInputValues()
            .then( async (obj) => {
                checkInputValues(obj)
                    .then( async (ok) => {
                        if (ok){
                            await sendToBackend(obj, 'ADDNEWTASK');
                            hideOverlay();
                        } else {
                            console.debug("[DEBUG] Not all required fields were filled out!");
                        }
                    })
                    .catch((err) => { console.error(err); });
            })
            .catch((err) => {
                console.error(err);
            })
    });

    deleteButton.addEventListener('click', async (evt) => {
        let hash = evt.target.dataset.hash;
        await sendToBackend({hash}, 'DELETETASK');  // this deletes everything
        await removeTaskByHash(hash);
        hideDetailsOverlay();
    });

    resolveButton.addEventListener('click', async (evt) => {
        let hash = evt.target.dataset.hash;
        await sendToBackend({hash}, 'RESOLVETASK'); // this resolves the task
        await removeTaskByHash(hash);
        hideDetailsOverlay();
    });

    searchInput.addEventListener('submit', evt => { evt.preventDefault(); });
    searchInput.addEventListener('click', evt => { evt.preventDefault(); });
    searchInput.addEventListener('keyup', (evt) => {
        evt.preventDefault();
        // control removal button
        if (evt.target.value.length > 0){
            document.querySelector('#search-icon').style.display = 'block';
        }
        // searching
        if (evt.target.value.length >= 3 ){
            let cards = document.querySelectorAll('div.card');
            for (let card of cards){
                let inner = card.innerText.toLowerCase();
                let target = evt.target.value.toLowerCase();
                let match = inner.includes(target);
                if (!match){
                    card.classList.add('card-hide');
                }
            }            
        }
    });
    searchInput.addEventListener('focusin', evt => {
        evt.preventDefault();
        document.onkeypress = undefined;
    });

    searchInput.addEventListener('focusout', evt => {
        evt.preventDefault();
        document.onkeypress = onkeypressfunction;
    });

    searchIcon.addEventListener('click', (evt) => {
        searchInput.value = '';
        resetCards();
        searchIcon.style.display = 'none';
    });


    /* ~~~~~~~~~~~~~~~~ METHODS ~~~~~~~~~~~~~~~~ */
    function showOverlay(){
        backdrop.classList.add('backdrop-show');
        slider.classList.add('show');
        // focus first input line and disable document.onkeypree
        document.querySelector('#input-task-title').focus();
        document.onkeypress = undefined;
    }

    function hideOverlay(){
        slider.classList.remove('show');
        backdrop.classList.remove('backdrop-show');
        document.onkeypress = onkeypressfunction;
    }

    function showDetailsOverlay(){
        backdrop.classList.add('backdrop-show');
        detailsSlider.classList.add('show');
    }

    function hideDetailsOverlay(){
        detailsSlider.classList.remove('show');
        backdrop.classList.remove('backdrop-show');
    }

    function showModal(){
        modal.classList.add('show-modal');
        backdrop.classList.add('backdrop-show');
    }

    function hideModal(){
        backdrop.classList.remove('backdrop-show');
        modal.classList.remove('show-modal');
    }

    function resetCards(){
        let cards = document.querySelectorAll('div.card');
        for (let card of cards){
            card.classList.remove('card-hide');
        }
    }

    function setDetails(card){
        let hash = card.dataset.hash;
        // Header = children[0]
        document.querySelector('#details-task-header').innerText = card.children[0].innerText;
        // Category = children[2].children[0]
        document.querySelector('#details-task-tag').innerText = card.children[2].children[0].innerText;
        // DueDate = children[2].children[1]
        document.querySelector('#details-task-duedate').innerText = card.children[2].children[1].innerText;
        // Description = children[1]
        document.querySelector('#details-task-description').innerText = card.children[1].innerText;
        // set hash to the control buttons
        document.querySelector('#details-task-remove').dataset.hash = hash;
        document.querySelector('#details-task-resolve').dataset.hash = hash;
    }

    const getInputValues = async () => {
        let title = document.querySelector('#input-task-title').value;
        let description = document.querySelector('#input-task-description').value;
        let dueDate = new Date(document.querySelector('#input-task-duedate').value);
        let creationDate = new Date();
        let category = document.querySelector('#input-task-category').value;
        return {title, description, dueDate, creationDate, category};
    };

    const checkInputValues = async(obj) => {
        if (obj.title === '' || (!(obj.dueDate instanceof Date) && !isNaN(obj.dueDate)) ){
            return false;
        }
        return true;
    };

    const removeTaskByHash = async (hash) => {
        let cards = document.querySelectorAll('div.card');
        for (let card of cards){
            if (card.dataset.hash === hash){
                contentRow.removeChild(card);
                break;
            }
        }
    }

    /**
     * Create DOM elements for each task with a card
     * @param {array} tasks 
     */
    const displayTasks = async (tasks) => {
        // 3 task cards per row
        let counter = 0;
        for (let i = 0; i<tasks.length; i++ ){
            let task = tasks[i];

            let card = document.createElement('div');
            let cardHeader = document.createElement('div');
            let cardContent = document.createElement('div');
            let cardFooter = document.createElement('div');
            let cardFooterTag = document.createElement('div');
            let cardFooterDate = document.createElement('div');

            card.dataset.hash = task.hash;
            card.classList.add('card');
            cardHeader.classList.add('card-header');
            cardContent.classList.add('card-content'); 
            cardFooter.classList.add('card-footer');
            cardFooterTag.classList.add('card-footer-tag');
            cardFooterDate.classList.add('card-footer-duedate');

            cardHeader.innerText = task.title;
            cardContent.innerText = task.description;
            cardFooterDate.innerText = new Date(task.dueDate).toLocaleDateString();
            cardFooterTag.innerText = task.category;
            cardFooter.appendChild(cardFooterTag);
            cardFooter.appendChild(cardFooterDate);

            card.appendChild(cardHeader);
            card.appendChild(cardContent);
            card.appendChild(cardFooter);
            contentRow.appendChild(card);

            card.addEventListener('click', (evt) => {
                setDetails(evt.target.parentNode);
                showDetailsOverlay();
            });

        }
    }


    /* ~~~~~~~~~~~~~~~~ MESSAGING ~~~~~~~~~~~~~~~~ */

    async function sendToBackend(taskObj, request){
        browser.runtime.sendMessage({url: window.location.href, 
                                    request, 
                                    payload: taskObj});
    }

    async function handleResponse(response){
        // console.log("[RESPONSE] ", response);
        if (response.originalrequest === 'GETACTIVETASKS'){
            displayTasks(response.tasks).then().catch( err => {console.error(err)});
        }
    }


    // on page opening, check for active tasks
    sendToBackend({}, 'GETACTIVETASKS')
        .then((obj) => {
            // console.log(obj);
        })
        .catch((err) => {
            console.error(err);
        })

    // Listen for messages from backend
    browser.runtime.onMessage.addListener(handleResponse);
});