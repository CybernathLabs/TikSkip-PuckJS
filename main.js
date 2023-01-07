var int = require("ble_hid_combo");

NRF.setServices(undefined, { hid : int.report });

var lappyConnection = false;
var lappyAddy = '14:7d:da:b0:60:ad';
var hostAddy;

var LED_RED = LED1;
var LED_GREEN = LED2;
var LED_BLUE = LED3;

var HEARTBEAT_FREQ = 10000;

var sleeping = false;
var SLEEP_TIMEOUT = 60;
var sleepCountdown = 60;

var interval; // Used for the "I'm awake" blink.

var longPressTimeout; // Used to help show a long press has occurred.

var longPressThreshold = 5;

function btnPressed(){
  sleepCountdown = SLEEP_TIMEOUT;
  if(!lappyConnection){
    int.scroll(50,0,()=>{
      int.scroll(50,0,()=>{
        int.scroll(50,0,()=>{
          flash(LED_GREEN);
        });
      });
    });
  }else{
    // This block runs if I'm connected to the computer, thus preventing it from
    // throwing errors. (Can't be connected to IDE and HID at the same time.
    console.log("Lappy Override");
    flash(LED_RED,250);
  }
}

// Quick flash of led for feedback purposes.
function flash(pin,dur){
    if(!dur) dur=50;
    pin.set();
    setTimeout(()=>{pin.reset();},dur);
}


// Function Runs on Button Release
function fallingEdgeClickHandler(e){
  console.log("Button Release");
  
  // Clear LED in case of potential race condition.
    LED_BLUE.reset();
    LED_RED.reset();
    LED_GREEN.reset();
  
  // Calculate length of press.
  var len = e.time - e.lastTime;
  
  // If we have set the timeout, (regardless of whether it completed)
  // Clear it.
  if(longPressTimeout){
    clearTimeout(longPressTimeout);
    longPressTimeout = 0;
  }

  // If radio is asleep, and we receive a semi-slow click. Wake it up.
  if(sleeping){
    wakeUp();
  }else{
    if(len > longPressThreshold){
      goToSleep();
    }else{
      btnPressed();
    }
  }
}

// Function runs upon button press
function risingEdgeClickHandler(){
  console.log("Button Press");
  longPressTimeout = setTimeout(function(){
    LED_BLUE.set();
    LED_RED.set();
    LED_GREEN.set();
  },longPressThreshold*1000);
}

// Since not all clicks will perform a wakeup, we're giving Green Led feedback upon
// successful wake command.
function wakeUp(){
  console.log("Wakeup");
  LED_GREEN.set();
  setTimeout(()=>{
    NRF.wake();
    //onConnect(hostAddy);
    sleeping = false;
    LED_GREEN.reset();
  },1000);
}

// 2 second display of RED led, and turn off the Bluetooth stuff.
function goToSleep(){
  console.log("Go To Sleep");
  LED_RED.set();
  setTimeout(()=>{
    LED_RED.reset();
    sleeping = true;
    NRF.sleep();
    //onDisconnect();
    // Sleep forces a disconnect event, which does our garbage cleanup.
  },1000);
}

// When a device connects, we test whether it's the dev computer, and then
// start the heartbeat flash.
function onConnect(addr){
  hostAddy = addr;
  sleepCountdown = SLEEP_TIMEOUT;
  if(lappyAddy.substring(0,17) == addr.substring(0,17)){
    lappyConnection = true;
    flash(LED1,500); // RED
  }else{
    flash(LED3,500); // BLUE
    lappyConnection = false;
  }
  // Flashes every 10 seconds to remind me a connection is active 
  // and thus burning battery life.
  interval = setInterval(onHeartbeat,HEARTBEAT_FREQ); 
}

function onHeartbeat(){
  flash(LED_BLUE,10);
  sleepCountdown --;
  console.log("Beats until sleep: ",sleepCountdown);
  if(sleepCountdown < 1){
    goToSleep();
  }
}

NRF.on("connect",onConnect);

// When device disconnects, we clean up any background crap and
// turn off leds. 
// Bluetooth continues advertising.

function onDisconnect(){
  digitalWrite([LED3,LED2,LED1], 0);
  flash(LED_RED,500);
  clearInterval(interval);
  clearTimeout(longPressTimeout);
}
NRF.on("disconnect",onDisconnect);

// Listeners for Button Press and release.
setWatch(fallingEdgeClickHandler, D0, { repeat:true, edge:'falling', debounce : 50 });
setWatch(risingEdgeClickHandler, D0, { repeat:true, edge:'rising', debounce : 50 });