(function(){

  const DATABASENAME = "RememberthatthingDatabase";
  const DATABASEVERSION = 1;
  const TASKSTORENAME = "tasks";
  const RESOLVEDTASKSTORENAME = "resolvedTasks";
  var db;
  // make sure the correct version gets called
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

  /* -------------------- HELPER -------------------- */
  String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return String(hash); // has to be string to be imutable for indexeddb access
  };

  Date.prototype.isValid = function () {
      // An invalid date object returns NaN for getTime() and NaN is the only
      // object not strictly equal to itself.
      return this.getTime() === this.getTime();
  };


  /* -------------------- Database Handling -------------------- */
  function openDB(){
    console.log("[INFO] opening indexed db ... ");
    let request = window.indexedDB.open(DATABASENAME, DATABASEVERSION);
    request.onerror = function(event){
      const msg = "Error retrieving database: " + String(event.target.errorCode);
      console.error(msg);
    };

    request.onsuccess = function(event){
      console.log("[INFO] Database request successful");
      let osNames = this.result.objectStoreNames;
      db = this.result;
    };

    request.onupgradeneeded = function(event){
      console.debug("[DEBUG] database upgrade ...");
      if (!event.currentTarget.result.objectStoreNames.contains(TASKSTORENAME)){
        console.debug("[DEBUG] creating initial objectstore" + TASKSTORENAME);
        var objectstore = event.currentTarget.result.createObjectStore(
          TASKSTORENAME, {keyPath: "hash", autoincrement: true} );
        // create an index for the objectStore
        objectstore.createIndex("hash", "hash", {unique: true});
        objectstore.createIndex("name", "name", {unique: false});
        objectstore.createIndex("creationDate", "creationDate", {unique:false});
        objectstore.createIndex("dueDate", "dueDate", {unique:false});
      } else {
        console.debug("[DEBUG] object store " +TASKSTORENAME + " already created.");
      }

      /*
        create new objectstores here
      */
      if (!event.currentTarget.result.objectStoreNames.contains(RESOLVEDTASKSTORENAME)){
        console.debug("[DEBUG] creating initial objectstore '" + RESOLVEDTASKSTORENAME + "'");
        let objstore = event.currentTarget.result.createObjectStore(
          RESOLVEDTASKSTORENAME, {keyPath: "hash", autoincrement: true });
        objstore.createIndex("hash", "hash", {unique: true});
        objstore.createIndex("name", "name", {unique: false});
      } else {
        console.debug("[DEBUG] object store '" + RESOLVEDTASKSTORENAME + "' already created");
      }
    }
  } // end openDB

  /**
  *   @param {string} store_name
  *   @param {string} mode either "readonly" or "readwrite"
  */
  function getObjectStore(store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
  }

  /**
   * Add a new task to the object store
   * @param {object} values 
   */
  function saveNewTaskToDatabase(values){
    values.hash = values.hash.hashCode();
    let store = getObjectStore(TASKSTORENAME, "readwrite");
    let req = store.add(values);
    req.onsuccess = function(evt){
      console.log("[INFO] New Data successfully added");
    };
    req.onerror = function(err){
      console.log("Error occured during adding values: ", err.target.errorCode);
    };
  }

  async function delteTaskFromDatabase(msg){
    let store = getObjectStore(TASKSTORENAME, 'readwrite');
    let req = store.delete(msg.payload.hash);
    req.onsuccess = async (evt) => {
      console.log("[INFO] Successfully removed: ", evt);
    };
    req.onerror = async (err) => {
      console.error(err);
    } 
  }

  async function resolveTask(msg){
    console.debug("[BACKEND] Resolving Task with Hash: ", msg.payload.hash);
    // first step: get the task to be resolved
    let firstStore = getObjectStore(TASKSTORENAME, "readwrite");
    let req = firstStore.get(msg.payload.hash);
    req.onsuccess = async (evt) => {
      //second step: add the task to the resolved store
      let task = evt.target.result;
      task.resolvedat = new Date();
      let secondStore = getObjectStore(RESOLVEDTASKSTORENAME, 'readwrite');
      let r = secondStore.add(task);
      r.onsuccess = async (e) => {
        // third step: remove the task from the original store
        let thirdStore = getObjectStore(TASKSTORENAME, 'readwrite');
        let request = thirdStore.delete(e.target.result);
        request.onsuccess = async (evt) => {
          console.log("[INFO] Successfully resolved: ", evt.target);
        };
        request.onerror = async (err) => {
          console.error(err);
        }
      };
      r.onerror = async (err) => {
        console.error(err);
      }
    };
    req.onerror = async (err) => {
      console.error(err);
    }
  }

  async function returnActiveTasks(originalMessage, sendbackCallback){
    let store = getObjectStore(TASKSTORENAME, 'readonly');
    let req = store.getAll();
    req.onsuccess = (evt) => {
      let results = evt.target.result;
      // make sure results are sorted n ascending order by due date
      results.sort((a,b) => {
        let t1 = a.dueDate.getTime();
        let t2 = b.dueDate.getTime();
        if (t1 > t2) return -1;
        else if (t1 === t2) return 0;
        else return 1;
      });
      // and then in ascending order by title
      results.sort((a,b) => {
        let t1 = a.title;
        let t2 = b.title;
        if (t1 > t2) return -1;
        else if (t1 === t2) return 0;
        else return 1;
      });
      sendbackCallback({taburl: originalMessage.url, 
                        originalrequest: originalMessage.request, 
                        tasks: results});
    };
    req.onerror = (err) => { handleError(err); };
  }


  

  /* ---------------------- MESSAGE HANDLING -------------------------------- */

	/* Generic error handling */
	function handleError(error){
		console.error("[ERROR] ", error);
	}

  /**
		Finds the requesting tab and sends back 
		the response object to its content script
	*/
	async function sendResponse(msgObj){
		console.debug("[DEBUG] Response message: ", msgObj);
		let query = browser.tabs.query({active: true, currentWindow: true});
		query.then((tabs) => {
			for (let tab of tabs){
				if (tab.url === msgObj.taburl){
					browser.tabs.sendMessage(tab.id, msgObj);
				}
			}
		}, handleError);
	}

	/**
    Handle the request from the requesting tab, based 
    on its message
	*/
	async function handleMessage(message){
		console.debug("[DEBUG] Message from: ", message);
		if (message.request === "GETACTIVETASKS"){        // get all tasks and return them
      console.debug("[BACKEND] Message received: ", message);
			await returnActiveTasks(message, sendResponse);			
    } 
    else if (message.request === 'ADDNEWTASK'){       // add the payload as new data
      let payload = message.payload;
      let hash = "" + payload.title + payload.creationDate;
      payload.hash = hash;
      saveNewTaskToDatabase(payload);
    }
    else if (message.request === 'DELETETASK'){       // delete task from database
      await delteTaskFromDatabase(message);
    }
    else if (message.request === 'RESOLVETASK'){      // move task from active to resolved store
      await resolveTask(message);
    }
    
    else {
			console.error("[ERROR] Unable to handle request from: ", message);
		}
	}



	// Execute on startup
	openDB();


	// Listener
	browser.runtime.onMessage.addListener(handleMessage);

})();
