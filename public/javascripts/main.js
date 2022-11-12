function menu(id) {
    let menuBar = document.getElementById(id);
    let body = document.getElementById('mainBody');
    menuBar.classList.toggle('deactive')
    body.classList.toggle('deactive')
}