from flask import Flask, request, make_response
from datetime import date

app = Flask(__name__)


@app.route('/')
def hello_world():
    return 'Hello World!'


if __name__ == '__main__':
    app.run()


@app.route('/checkLicense.php', methods=['GET', 'POST'])
def test():
    resdata = "testdata"
    response = make_response(resdata, 200)
    response.mimetype = "text/html"
    print(request.__dict__)

    return response


@app.route('/checkUpdate.php', methods=['GET', 'POST'])
def test2():
    data = request.form['action']
    print("data is: ", data)

    if data == '1':
        return "751069769"
    if data == '2':
        return '{"Result":"Success"}'
    else:
        return "null"


@app.route('/vendorpayment/', methods=['GET', 'POST'])
def ok():
    # return (request.data)
    value = {'invoiceID':'2314CX', 'vendor':'WalMart', 'productname':'Display Cable', 'price':'14.60', 'time': date.today() }
    return value;
