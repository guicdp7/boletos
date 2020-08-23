const Controller = require("../Controller");

module.exports = class BarcodeController extends Controller {
  constructor(app, req, resp) {
    super(app, req, resp);
    this.barcodeInfo = {
      conc: {
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
      },
    };
  }

  indexMethod() {
    const query = this.reqQuery();

    let barcode = query.value;

    // concessionárias
    if ((barcode && barcode.length === 48) || barcode.length === 44) {
      if (barcode.length !== 44) {
        barcode = this.removeDigits(barcode, 4);
      }

      const barcodeData = {
        prodId: barcode.substring(0, 1),
        segId: barcode.substring(1, 2),
        refValueId: barcode.substring(2, 3),
        generalDigit: Number(barcode.substring(3, 4)),
      };

      const info = this.barcodeInfo.conc;

      const barcodeInfo = {
        prod: info.prod[barcodeData.prodId],
        seg: info.seg[barcodeData.segId],
        refValue: info.refValue[barcodeData.refValueId],
      };

      if (barcodeInfo.prod && barcodeInfo.seg && barcodeInfo.refValue) {
        if (this.validateGeneralDigit(barcode, barcodeData, barcodeInfo)) {
          const response = {
            barcode: barcode,
          };

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

          const date = this.checkDate(barcodeData);
          if (date) {
            barcodeData.expiry = date;
          }

          response.barcodeData = barcodeData;
          response.barcodeInfo = barcodeInfo;

          this.respSuccess(response);
        } else {
          this.respError("código de barras inválido", "0000x2");
        }
      } else {
        this.respError("código de barras inválido", "0000x1");
      }
    } else {
      this.respError("código de barras inválido", "0000x0");
    }
  }

  checkDate(barcodeData) {
    const checkDate = (dt) => {
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
        dt.substring(0, 4) + "-" + dt.substring(4, 6) + "-" + dt.substring(6, 8)
      );
    };

    let barcodeDate = transform(barcodeData.companyFreeField);
    let dateResult;

    if (checkDate(barcodeDate)) {
      dateResult = barcodeData;
    } else {
      barcodeDate = transform(barcodeData.companyFreeField2);
      if (checkDate(barcodeDate)) {
        dateResult = barcodeData;
      }
    }

    return dateResult ? format(dateResult) : undefined;
  }

  removeDigits(barcode, numberOfBlocks) {
    barcode = typeof barcode !== "string" ? barcode.toString() : barcode;

    if (barcode.length % numberOfBlocks === 0) {
      const blockSize = barcode.length / numberOfBlocks;

      const blocks = [];

      for (let i = 0; i < numberOfBlocks; i++) {
        const start = i * blockSize;
        const end = start + blockSize;

        blocks.push(barcode.substring(start, end - 1));
      }

      return blocks.join("");
    }

    console.log(barcode);

    return barcode;
  }

  validateGeneralDigit(barcode, barcodeData, barcodeInfo) {
    const withOutDigit = barcode.substring(0, 3) + barcode.substring(4);
    const generalDigit = barcodeData.generalDigit;
    const digit = barcodeInfo.refValue.digit;

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
};
