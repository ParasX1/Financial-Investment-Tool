export async function fetchUserStocks(userId: string) {
    const headers: Headers = new Headers()
    headers.set('Content-Type', 'application/json')
    return fetch("http://localhost:8080/api/stocks/get", {
        method: "POST",
        body: JSON.stringify({id: userId}),
        headers: headers
    })
    .then((response) => response.json())
    .then((data) => {
        return data
    });
}

export enum StockAction {
    Add = "add",
    Remove = "remove",
    Clear = "clear",
}

export async function setUserStocks(userId: string, stocks: string[]) {
    const headers: Headers = new Headers()
    headers.set('Content-Type', 'application/json')
    return fetch("http://localhost:8080/api/stocks/set", {
        method: "POST",
        body: JSON.stringify({id: userId, stocks: stocks}),
        headers: headers
    })
    .then((response) => response.json())
    .then((data) => {
        return data
    });
}