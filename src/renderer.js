
console.log("window.electron: ", window.electron)

window.electron.onComputeLog((response) => {
    console.log(response); // Output: Response from main process
    const newLi = document.createElement('li');
    newLi.style.display = 'flex'

    const time = document.createElement('p');
    time.style.color = 'green'
    time.style.marginRight = '10px'
    time.innerText = "[" + new Date().toLocaleDateString() + "-" + new Date().toLocaleTimeString() + "]"
    newLi.appendChild(time);

    const text = document.createElement('p');
    text.innerText=response
    newLi.appendChild(text);

    document.getElementById('log').appendChild(newLi);
});