import jQuery from 'jquery';
import Player from './player';

export default class PlayerChat {
  constructor() {
    this.initialized = false;
    this.loading = true;

    this.collections = {};
    this.messages = [];
    this.messagesToBeRendered = [];
    this.timestamp = 0;
    this.previousTimestamp = false;
    this.lastTimestamp = false;

    this.registerEventListeners();

    // Reset interface
    jQuery('form[name="chat_message"]').get(0).reset();
  }

  registerEventListeners() {
    jQuery(document).on('click', '[data-chat-activator]', (event) => {
      event.preventDefault();

      if (this.initialized) {
        return;
      }

      this.initialized = true;

      this.reset(this.timestamp);

      // Set up styling
      this.resize();
      jQuery(window).resize(this.resize);
      jQuery('#chat_container').resize(this.resize);
    });

    jQuery(document).on('submit', 'form[name="chat_message"]', (event) => {
      event.preventDefault();

      let messageForm = jQuery('form[name="chat_message"]');
      let messageContentsInput = messageForm.find('[name="chat_message[contents]"]');
      let messagePostedAtInput = messageForm.find('[name="chat_message[postedAt]"]');

      if (messagePostedAtInput.val() < 1) {
        alert('Please start playing before posting a message.');

        return;
      }

      if (messageContentsInput.val().length < 1) {
        alert('Please enter a message before trying to post.');

        return;
      }

      let data = {};
      messageForm.serializeArray().forEach((value) => {
        let name = value.name.match(/\[([^)]+)]/)[1];
        data[name] = value.value;
      });

      messageForm.get(0).reset();

      postMessage(data);
    });
  }

  resize() {
    let viewportContainer = jQuery('#chat_container');

    viewportContainer.closest('.flex-grow-1').find('> .tab-pane').removeClass('active').removeClass('show');

    // viewportContainer.css('height', 'calc(' + viewportContainer.closest('.flex-grow-1').height() + 'px - 1.5rem)');
    viewportContainer.css('height', viewportContainer.closest('.flex-grow-1').height() + 'px');

    jQuery('#chat').addClass('active').addClass('show');
  }

  reset(timestamp) {
    this.timestamp = timestamp;
    this.previousTimestamp = false;
    this.lastTimestamp = false;
    this.messagesToBeRendered = [];

    jQuery('.site-chat-message').remove();

    let collection = Math.floor(timestamp / 1000);

    if (typeof this.collections[collection] === 'undefined') {
      this.loading = true;

      jQuery('#chat_loading').removeClass('d-none');
      jQuery('#chat_container').addClass('d-none').removeClass('d-flex');
    }

    this.step(timestamp);
  }

  step(timestamp) {
    if (timestamp === this.timestamp) {
      return;
    }

    this.timestamp = timestamp;

    if (!this.initialized) {
      return;
    }

    // Update message form
    let messageForm = jQuery('form[name="chat_message"]');
    let messagePostedAtInput = messageForm.find('[name="chat_message[postedAt]"]');

    if (Math.trunc(timestamp) > 0) {
      messageForm.find('[type="submit"]').removeAttr('disabled');
    }
    else {
      messageForm.find('[type="submit"]').attr('disabled', 'disabled');
    }

    messagePostedAtInput.val(Math.trunc(timestamp));

    let messages = jQuery('.site-chat-message');
    if (messages.length >= 500) {
      messages.slice(0, messages.length - 500).remove();
    }

    // Grab current scroll position
    let messageViewportContainer = jQuery('[data-chat-container]').closest('.oy-scroll');
    let maxScrollTop = messageViewportContainer.get(0).scrollHeight - messageViewportContainer.height();

    // Render messages
    this.fetchMessages(timestamp);
    this.updateMessagesToBeRendered(timestamp);

    if (this.messagesToBeRendered.length === 0) {
      return;
    }

    this.messagesToBeRendered.map(message => this.renderMessage(message));

    this.messagesToBeRendered = [];

    // Update scroll position
    let newScrollTop = messageViewportContainer.get(0).scrollHeight - messageViewportContainer.height();

    if (newScrollTop !== maxScrollTop && messageViewportContainer.get(0).scrollTop > maxScrollTop - 16) {
      messageViewportContainer.get(0).scrollTop = messageViewportContainer.get(0).scrollHeight;
    }
  }

  fetchMessages(timestamp) {
    let container = jQuery('[data-chat-container]');

    let collection = Math.floor(timestamp / 1000);

    if (typeof this.collections[collection] !== 'undefined') {
      timestamp = timestamp + 50;
      let futureCollection = Math.floor(timestamp / 1000);

      // Check for future messages
      if (collection !== futureCollection && typeof this.collections[futureCollection] === 'undefined') {
        this.fetchMessages(timestamp);
      }

      return;
    }

    this.collections[collection] = true;

    fetch('/chat_messages/' + container.data('episode') + '/' + collection)
      .then(response => response.json())
      .then(messages => {
        messages.map(message => this.messages.push(message));

        if (this.loading) {
          this.loading = false;

          jQuery('#chat_loading').addClass('d-none');
          jQuery('#chat_container').removeClass('d-none').addClass('d-flex');
        }
      })
    ;
  }

  postMessage(data) {
    let requestOptions = {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

    fetch('/chat', requestOptions)
      .then(response => response.json())
      .then(response => {
        if (typeof response.status === 'undefined' || response.status === 'error') {
          alert('An error occurred while trying to post your message.');
        }

        this.renderMessage(response.message);
      })
    ;
  }

  renderMessage(message) {
    let container = jQuery('[data-chat-container]');
    let template = container.data('prototype');

    let html = template
      .replace('__timestamp__', this.previousTimestamp !== message[2] ? Player.formatTime(message[2]) : '')
      .replace('__username__', message[0])
      .replace('__text__', message[1])
    ;
    let element = jQuery(html);

    // element.data('timestamp', message[2]);

    if (message[3] === 2) {
      element.find('.site-chat-username').css('color', 'rgba(0, 123, 255, .3)');
    }

    if (message[3] === 1 && message[0] === container.data('username')) {
      element.find('.site-chat-username').css('color', 'rgba(255, 193, 7, .3)');
    }

    container.find('> :last-child').after(element);

    this.previousTimestamp = message[2];
  }

  sortMessages(a, b) {
    // Sort by timestamp
    if (a[2] > b[2]) {
      return 1;
    }
    else if (a[2] < b[2]) {
      return -1;
    }

    // Sort by source
    if (a[3] > b[3]) {
      return 1;
    }
    else if (a[3] < b[3]) {
      return -1;
    }

    return 0;
  }

  updateMessagesToBeRendered(timestamp) {
    if (this.loading || this.messagesToBeRendered.length > 0) {
      return;
    }

    if (this.lastTimestamp === false) {
      this.lastTimestamp = timestamp;

      this.messages
        .filter(message => {
          return message[2] <= timestamp;
        })
        .sort(this.sortMessages)
        .slice(-10)
        .map(message => this.messagesToBeRendered.push(message))
      ;
    }

    this.messages
      .filter(message => {
        return message[2] > this.lastTimestamp && message[2] <= timestamp;
      })
      .map(message => this.messagesToBeRendered.push(message))
    ;

    this.messagesToBeRendered.sort(this.sortMessages);

    this.lastTimestamp = timestamp;
  }
}