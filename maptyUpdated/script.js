'use strict';

let messageShown = false;
class Workout {
    constructor(latLng, distance, duration, date, id) {
        this.latLng = latLng; // [lat, lng]
        this.distance = distance;
        this.duration = duration;
        this.date = date;
        !date ? (this.date = new Date()) : (this.date = new Date(`${date}`));
        this.id = id;
        !id ? (this.id = Date.now().toString()) : (this.id = id);
    }
    _setDescription() {
        // prettier-ignore
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 
        'september', 'october', 'november', 'december'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(
            1
        )} on 
        ${months[this.date.getMonth()][0].toUpperCase()}${months[
            this.date.getMonth()
        ].slice(1)} ${this.date.getDate()}`;
        // ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(latLng, distance, duration, date, id, cadence) {
        super(latLng, distance, duration, date, id);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Jogging extends Workout {
    type = 'jogging';
    constructor(latLng, distance, duration, date, id, cadence) {
        super(latLng, distance, duration, date, id);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(latLng, distance, duration, date, id, elevationGain) {
        super(latLng, distance, duration, date, id);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// Application Architecture /////////////////////////////////////////////////
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadenceRun');
const inputElevation = document.querySelector('.form__input--elevation');
const btnReset = document.querySelector('.btn--clear-all');

const inputCadenceJogging = document.querySelector(
    '.form__input--cadenceJogging'
);

const inputTypeRun = document.getElementsByClassName('form__row');
const inputTypeBike = document.getElementsByClassName('form__row');
const inputTypeJog = document.getElementsByClassName('form__row');

class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 16;
    #workouts = [];
    #markers = [];
    curLoc;
    constructor() {
        // get user's position
        this._getPosition();

        // get data from localstorage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change', this._toggleElevationField);

        // inputType.addEventListener('change', function (e) {
        //     inputCadence
        //         .closest('.form__row')
        //         .classList.toggle('.form__row-hidden');
        // });

        containerWorkouts.addEventListener('click', e => {
            const trashBin = e.target.closest('.workout__delete');
            if (!trashBin) this._moveToPopup(e);
            else {
                const workoutEl = e.target.closest('.workout');
                if (!workoutEl) return;
                this._deleteWorkout(workoutEl.dataset.id);
            }
        });
        // Delete all workouts
        btnReset.addEventListener('click', this._deleteAllWorkouts);
    }
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                () => {
                    errorMessage(
                        "I couldn't get your current location.\r\nDefault location: Phnom Penh, Cambodia."
                    );
                    const phnomPenh = {
                        coords: {
                            latitude: 11.55,
                            longitude: 104.91667,
                        },
                    };
                    this._loadMap(phnomPenh);
                }
            );
        }
    }

    showWorkout() {
        return this.#workouts;
    }

    _getZoom() {
        this.#mapZoomLevel = this.#map.getZoom();
    }
    _loadMap(position) {
        this.curLoc = position;

        const { longitude, latitude } = position.coords;
        const latLong = [latitude, longitude];
        this.#map = L.map('map').setView(latLong, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));
        this.#map.on('zoomend', this._getZoom.bind(this));
        this.#workouts.forEach(wOut => {
            this._renderWorkout(wOut);
            this._renderWorkoutMarker(wOut);
        });
        toastMessage('App Loaded');
        //toastMessage('app loaded');
        //this._renderCurrentLocationMarker(this.curLoc); // <--- shows current location (hide for now since doesn't matter)
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value =
            inputCadence.value =
            inputDuration.value =
            inputElevation.value =
            inputCadenceJogging.value =
                ''; // makes the input values when form is shown empty/blank so the user inputs data
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);
    }
    _toggleElevationField() {
        inputElevation
            .closest('.form__row')
            .classList.toggle('form__row--hidden');
        inputCadence
            .closest('.form__row')
            .classList.toggle('form__row--hidden');

        // inputCadenceJogging
        //     .closest('.form__row')
        //     .classList.toggle('form__row--hidden');
    }

    _getWorkouts() {
        // doesn't seem to do anything because function is not called?
        return this.#workouts;
    }
    _newWorkout(e) {
        //helper functions
        const validInput = (...inputs) =>
            inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { latlng } = this.#mapEvent;
        let workout;

        //check if data is valid

        // if running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value; // "+" is like Number() when put in front of the variable
            if (
                !validInput(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return errorMessage(`Input must be a valid input!
Cannot have any negative values, including 0!`);
            workout = new Running(
                latlng,
                distance,
                duration,
                undefined, // needs undefined in order to work?!?! what?!?!
                undefined,
                cadence
            );
            //workout = new Running(latlng, distance, duration, cadence);
        }

        if (type === 'jogging') {
            const cadence = +inputCadenceJogging.value; // "+" is like Number() when put in front of the variable
            if (
                !validInput(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return errorMessage(`Jog input must be a valid input!
Cannot have any negative values, including 0!`);
            workout = new Jogging(
                latlng,
                distance,
                duration,
                undefined, // needs undefined in order to work?!?! what?!?!
                undefined,
                cadence
            );
            //workout = new Running(latlng, distance, duration, cadence);
        }

        // if cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (
                !validInput(distance, duration, elevation) ||
                !allPositive(distance, duration)
            )
                return errorMessage(`Input must be a valid input!
Only negative values and 0 are allowed for elevation in cycling workouts`);
            workout = new Cycling(
                latlng,
                distance,
                duration,
                undefined,
                undefined,
                elevation
            );
            //workout = new Cycling(latlng, distance, duration, elevation);
        }
        // add new object to workout array
        this.#workouts.push(workout);

        // render workout on map as marker
        this._renderWorkoutMarker(workout);

        // render workout on list
        this._renderWorkout(workout);
        // hide the form && clear input fields
        this._hideForm();

        // set workout to localstorage
        this._setLocalStorage();
        toastMessage(
            `${workout.type[0].toUpperCase()}${workout.type.slice(
                1
            )} Workout Added`
        );
        //toastMessage('Workout Added');
        //toastMessage('record added');

        e.preventDefault();
    }

    _renderCurrentLocationMarker(position) {
        const latLng = [position.coords.latitude, position.coords.longitude];
        L.marker(latLng)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                })
            )
            .setPopupContent(`📍 Current Location`)
            .openPopup();
    }

    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.latLng);
        this.#markers.push(marker);
        console.log(this.#markers);
        marker
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(
                `${
                    workout.type === 'running' || workout.type === 'jogging'
                        ? '🏃‍♂️'
                        : '🚴‍♀️'
                } ${workout.description}`
            )
            .openPopup();
    }
    _renderWorkout(workout) {
        let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    
        <h2 class="workout__title">
          <span>${workout.description}</span>
          <span class="workout__delete">🗑</span>
        </h2>
      <div class="workout__details">
        <span class="workout__icon">${
            workout.type === 'running' || workout.type === 'jogging'
                ? '🏃‍♂️'
                : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
  `;
        if (workout.type === 'running')
            html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">steps/min</span>
        </div>
    </li>`;

        if (workout.type === 'jogging')
            html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">jog/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼JOG</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">steps/min</span>
        </div>
    </li>`;

        if (workout.type === 'cycling')
            html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      </li>
      `;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup = e => {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );

        this.#map.setView(workout.latLng, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
        this._setLocalStorage();
    };

    // _deleteWorkout(id) {
    //     const domEL = document.querySelector(`[data-id="${id}"]`);
    //     this.#workouts.forEach((wk, i) => {
    //         if (wk.id === id) {
    //             this.#workouts.splice(i, 1);

    //             this.#markers[i].remove();
    //             this.#markers.splice(i, 1);
    //         }
    //     });
    //     this._setLocalStorage();
    //     domEL.remove();
    // }

    _deleteWorkout(id) {
        const domEL = document.querySelector(`[data-id="${id}"]`);
        this.#workouts.forEach((wk, i) => {
            if (wk.id === id) {
                this.#workouts.splice(i, 1);

                this.#markers[i].remove();
                this.#markers.splice(i, 1);
            }
        });
        this._setLocalStorage();
        domEL.remove(); // <--- removes element without having to refresh the entire page with "location.reload()"
        //location.reload();
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = localStorage.getItem('workouts');
        const workouts = JSON.parse(data);

        if (!workouts) return;
        workouts.forEach(wo => {
            let workout = {};
            if (wo.type === 'running') {
                workout = new Running(
                    wo.latLng,
                    wo.distance,
                    wo.duration,
                    wo.date,
                    wo.id,
                    wo.cadence
                );
            }
            if (wo.type === 'jogging') {
                workout = new Jogging(
                    wo.latLng,
                    wo.distance,
                    wo.duration,
                    wo.date,
                    wo.id,
                    wo.cadence
                );
            }
            if (wo.type === 'cycling') {
                workout = new Cycling(
                    wo.latLng,
                    wo.distance,
                    wo.duration,
                    wo.date,
                    wo.id,
                    wo.elevationGain
                );
            }
            this.#workouts.push(workout);
        });
    }
    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

    _deleteAllWorkouts() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();

//btnReset.addEventListener('click', app.reset);

//btnReset.addEventListener('click', app._deleteAllWorkouts); // <--- I've put it inside the constructor of the App Object
// some msg things
function errorMessage(msg) {
    const msgOverlay = document.createElement('div');
    msgOverlay.classList.add('msg-overlay');
    const msgContainer = document.createElement('div');
    msgContainer.classList.add('msg-container');
    const msgBtnClose = document.createElement('button');
    msgBtnClose.classList.add('msg-btnClose');
    msgBtnClose.textContent = 'X';

    const msgHeading = document.createElement('h2');
    msgHeading.classList.add('msg-heading');
    msgHeading.textContent = 'Error';
    const msgText = document.createElement('p');
    msgText.classList.add('msg-text');
    msgText.textContent = msg;

    msgContainer.append(msgBtnClose, msgHeading, msgText);
    msgOverlay.append(msgContainer);

    //prevent multiple messges
    if (messageShown === true) {
        msgOverlay.remove();
    } else {
        messageShown = true;
        document.querySelector('body').append(msgOverlay);
    }

    const btnClose = document.querySelectorAll('.msg-btnClose');
    btnClose.forEach(btnCls => {
        //btnCls.addEventListener('click', () => {
        btnCls.addEventListener('click', function () {
            msgOverlay.remove();
            messageShown = false;
        });
    });
}

function toastMessage(msg) {
    const toastContainer = document.createElement('div');
    toastContainer.classList.add('toast-container');
    const toastText = document.createElement('p');
    toastText.classList.add('toast-text');
    toastText.textContent = `${msg}`;
    toastContainer.append(toastText);
    document.querySelector('body').append(toastContainer);
    setTimeout(() => {
        toastContainer.remove();
    }, 3000);
}
