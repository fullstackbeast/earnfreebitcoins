
const initializeElements = ()=>{
    var elems = document.querySelectorAll('.datepicker');
    var instances = M.Datepicker.init(elems, {
        
    })


    var selects = document.querySelectorAll('select');
    var selectInstance = M.FormSelect.init(selects, {
        
    });
}

document.addEventListener('DOMContentLoaded', initializeElements)