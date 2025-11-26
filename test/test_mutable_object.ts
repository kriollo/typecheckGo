// Test case for mutable object property assignment
const init = {
    method: 'POST',
    headers: {}
};

type VersaParamsFetch = string | FormData;
const data: VersaParamsFetch = "test";

init.body = data;
