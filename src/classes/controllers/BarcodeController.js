const Controller = require("../Controller");

module.exports = class BarcodeController extends Controller {
  constructor(app, req, resp) {
    super(app, req, resp);
    this.barcodeConcInfo = {
      prod: {
        8: "arrecadação",
      },
      seg: {
        1: "Prefeituras",
        2: "Saneamento",
        3: "Energia Elétrica e Gás",
        4: "Telecomunicações",
        5: "Órgãos Governamentais",
        6: "Carnes e Assemelhados ou demais Empresas / Órgãos que serão identificadas através do CNPJ",
        7: "Multas de trânsito",
        9: "Uso exclusivo do banco",
      },
      refValue: {
        6: {
          effectiveValue: true,
          digit: 10,
        },
        7: {
          effectiveValue: false,
          digit: 10,
        },
        8: {
          effectiveValue: true,
          digit: 11,
        },
        9: {
          effectiveValue: false,
          digit: 11,
        },
      },
    };
  }

  indexMethod() {
    const query = this.reqQuery();

    const response = {
      barcodeReceived: query.value,
    };

    let barcode = query.value;

    if (barcode) {
      barcode = barcode.replace(/[^0-9]/g, "");
    }

    if (
      barcode &&
      (barcode.length === 48 || barcode.length === 47 || barcode.length === 44)
    ) {
      const checkResult = this.checkBarcodeType(barcode);
      const type = checkResult[0];

      barcode = checkResult[1];
      response.barcode = barcode;

      if (type === "conc") {
        // concessionárias
        const barcodeData = {
          prodId: barcode.substring(0, 1),
          segId: barcode.substring(1, 2),
          refValueId: barcode.substring(2, 3),
          generalDigit: Number(barcode.substring(3, 4)),
        };

        const info = this.barcodeConcInfo;

        const barcodeInfo = {
          prod: info.prod[barcodeData.prodId],
          seg: info.seg[barcodeData.segId],
          refValue: info.refValue[barcodeData.refValueId],
        };

        if (barcodeInfo.prod && barcodeInfo.seg && barcodeInfo.refValue) {
          if (barcodeInfo.refValue.effectiveValue) {
            let value = barcode.substring(4, 15);
            value =
              value.substring(0, value.length - 2) +
              "." +
              value.substring(value.length - 2);
            barcodeData.value = parseFloat(value);
          }
          barcodeData.companyId = barcode.substring(15, 19);
          barcodeData.companyFreeField = barcode.substring(19, 44);
          barcodeData.cnpjMf = barcode.substring(15, 23);
          barcodeData.companyFreeField2 = barcode.substring(23, 44);

          const date = this.checkDate(type, barcodeData);
          if (date) {
            barcodeData.expiry = date;
          }

          response.barcodeData = barcodeData;
          response.barcodeInfo = barcodeInfo;

          this.respSuccess(response);
        } else {
          this.respError("código de barras inválido", "0000x2");
        }
      } else if (type === "bank") {
        // títulos bancários
        const barcodeData = {
          bankId: barcode.substring(0, 3),
          currencyId: barcode.substring(3, 4),
          generalDigit: Number(barcode.substring(4, 5)),
          expirationFactor: barcode.substring(5, 9),
          companyFreeField: barcode.substring(19, 44),
        };

        let value = barcode.substring(9, 19);
        value = parseFloat(
          value.substring(0, value.length - 2) +
            "." +
            value.substring(value.length - 2)
        );

        if (value) {
          barcodeData.value = parseFloat(value);
        }

        const date = this.checkDate(type, barcodeData);
        if (date) {
          barcodeData.expiry = date;
        }

        response.barcodeData = barcodeData;

        this.respSuccess(response);
      } else {
        this.respError("código de barras inválido", "0000x1");
      }
    } else {
      this.respError("código de barras inválido", "0000x0");
    }
  }

  checkBarcodeType(barcode) {
    if (barcode.length === 44) {
      if (this.validateBankDigit(barcode)) {
        return ["bank", barcode];
      } else if (this.validateConcDigit(barcode)) {
        return ["conc", barcode];
      }
    } else if (barcode.length === 48) {
      const noDigits = this.removeConcDigits(barcode);
      if (noDigits && this.validateConcDigit(noDigits)) {
        return ["conc", noDigits];
      }
    } else if (barcode.length === 47) {
      const noDigits = this.removeBankDigits(barcode);
      if (noDigits && this.validateBankDigit(noDigits)) {
        return ["bank", noDigits];
      }
    }
    return [];
  }

  checkDate(type, barcodeData) {
    if (type === "conc") {
      const cd = (dt) => {
        const date = new Date(dt);

        if (Object.prototype.toString.call(date) === "[object Date]") {
          if (!isNaN(date.getTime())) {
            return true;
          }
        }
        return false;
      };

      const format = (dt) => {
        const split = dt.split("-");
        return (
          (Number(split[2]) < 10 ? "0" + split[2] : split[2]) +
          "/" +
          (Number(split[1]) < 10 ? "0" + split[1] : split[1]) +
          "/" +
          split[0]
        );
      };

      const transform = (dt) => {
        return (
          dt.substring(0, 4) +
          "-" +
          dt.substring(4, 6) +
          "-" +
          dt.substring(6, 8)
        );
      };

      let barcodeDate = transform(barcodeData.companyFreeField);
      let dateResult;

      if (cd(barcodeDate)) {
        dateResult = barcodeData;
      } else {
        barcodeDate = transform(barcodeData.companyFreeField2);
        if (cd(barcodeDate)) {
          dateResult = barcodeData;
        }
      }

      return dateResult ? format(dateResult) : undefined;
    } else if (type === "bank") {
      const date = new Date("1997-10-07 00:00:00");
      const days = Number(barcodeData.expirationFactor);

      if (days) {
        date.setDate(date.getDate() + days);

        const day = date.getDate();
        const month = date.getMonth() + 1;

        return (
          (day < 10 ? "0" + day : day) +
          "/" +
          (month < 10 ? "0" + month : month) +
          "/" +
          date.getFullYear()
        );
      }
    }
    return;
  }

  // remoção dos dígitos de títulos bancários
  removeBankDigits(barcode) {
    const fields = [
      barcode.substring(0, 9),
      barcode.substring(10, 20),
      barcode.substring(21, 31),
    ];

    const digits = [
      Number(barcode.substring(9, 10)),
      Number(barcode.substring(20, 21)),
      Number(barcode.substring(31, 32)),
      barcode.substring(32, 33),
    ];

    for (let i = 0; i < fields.length; i++) {
      if (!this.validateFieldModule10(fields[i], digits[i])) {
        return;
      }
    }

    fields.push(barcode.substring(33, 47));

    return (
      fields[0].substring(0, 4) +
      digits[3] +
      fields[3] +
      fields[0].substring(4) +
      fields[1] +
      fields[2]
    );
  }

  // remoção dos dígitos de boletos de concessionárias
  removeConcDigits(barcode) {
    const numberOfBlocks = 4;
    barcode = typeof barcode !== "string" ? barcode.toString() : barcode;

    if (barcode.length % numberOfBlocks === 0) {
      const blockSize = barcode.length / numberOfBlocks;

      const blocks = [];

      for (let i = 0; i < numberOfBlocks; i++) {
        const start = i * blockSize;
        const end = start + blockSize;

        if (!this.validateFieldModule10(barcode.substring(start, end))) {
          return;
        }
        blocks.push(barcode.substring(start, end - 1));
      }

      return blocks.join("");
    }

    return;
  }

  // validação do dígito de títulos bancários
  validateBankDigit(barcode) {
    const withOutDigit = barcode.substring(0, 4) + barcode.substring(5);
    const generalDigit = Number(barcode.substring(4, 5));

    let seqId = 0;
    const sequence = [2, 3, 4, 5, 6, 7, 8, 9];

    const next = () => {
      const item = sequence[seqId];
      if (item) {
        seqId++;
        return item;
      } else {
        seqId = 0;
        return next();
      }
    };

    const results = [];
    for (let i = withOutDigit.length - 1; i >= 0; i--) {
      const num = Number(withOutDigit[i]) * next();
      results.push(num);
    }

    const result = results.reduce((total, item) => total + item);

    let dac = 11 - (result % 11);
    dac = dac === 0 || dac === 10 || dac === 11 ? 1 : dac;

    return dac === generalDigit;
  }

  // validação do dígito de boletos de concessionárias
  validateConcDigit(barcode) {
    const withOutDigit = barcode.substring(0, 3) + barcode.substring(4);
    const generalDigit = Number(barcode.substring(3, 4));
    const refValueId = barcode.substring(2, 3);
    const refValue = this.barcodeConcInfo.refValue[refValueId];

    if (refValue) {
      const digit = refValue.digit;

      let seqId = 0;
      let sequence = [];

      const next = () => {
        const item = sequence[seqId];
        if (item) {
          seqId++;
          return item;
        } else {
          seqId = 0;
          return next();
        }
      };

      if (digit === 10) {
        sequence = [2, 1];
      } else if (digit === 11) {
        sequence = [2, 3, 4, 5, 6, 7, 8, 9];
      }

      const results = [];
      for (let i = withOutDigit.length - 1; i >= 0; i--) {
        const num = Number(withOutDigit[i]) * next();

        if (digit === 10) {
          if (num.toString().length > 1) {
            for (let j = 0; j < num.toString().length; j++) {
              results.push(Number(num.toString()[j]));
            }
          } else {
            results.push(num);
          }
        } else if (digit === 11) {
          results.push(num);
        }
      }

      const result = results.reduce((total, item) => total + item);

      let dac = 0;
      if (digit === 10) {
        dac = result % 10;
        dac = dac === 0 ? 0 : 10 - dac;
      } else if (digit === 11) {
        dac = result % 11;
        dac = dac === 0 || dac === 1 ? 0 : 11 - dac;
      }

      return dac === generalDigit;
    }
    return false;
  }

  validateFieldModule10(field, digit) {
    let generalDigit = Number(digit);
    let withOutDigit = field;

    if (!digit) {
      generalDigit = Number(field.substring(field.length - 1));
      withOutDigit = field.substring(0, field.length - 1);
    }

    let seqId = 0;
    const sequence = [2, 1];

    const next = () => {
      const item = sequence[seqId];
      if (item) {
        seqId++;
        return item;
      } else {
        seqId = 0;
        return next();
      }
    };

    const results = [];
    for (let i = withOutDigit.length - 1; i >= 0; i--) {
      const num = Number(withOutDigit[i]) * next();

      if (num.toString().length > 1) {
        for (let j = 0; j < num.toString().length; j++) {
          results.push(Number(num.toString()[j]));
        }
      } else {
        results.push(num);
      }
    }

    const result = results.reduce((total, item) => total + item);

    let dac = result % 10;
    dac = dac === 0 ? 0 : 10 - dac;

    return dac === generalDigit;
  }
};
