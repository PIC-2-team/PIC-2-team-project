import '@testing-library/jest-dom';

// jsdom은 HTMLDialogElement.showModal / close를 구현하지 않는다.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
