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

  index() {
    const query = this.reqQuery();

    let barcode = query.value;

    // concessionárias
    if (barcode && barcode.length === 48) {
      barcode = this.removeDigits(barcode, 4);

      const response = {
        barcode: barcode,
      };

      const barcodeData = {
        prodId: barcode.substring(0, 1),
        segId: barcode.substring(1, 2),
        refValueId: barcode.substring(2, 3),
        generalDigit: barcode.substring(3, 4),
        value: barcode.substring(4, 15),
        companyId: barcode.substring(15, 19),
        companyFreeField: barcode.substring(19, 44),
        cnpjMf: barcode.substring(15, 23),
        companyFreeField2: barcode.substring(23, 44),
      };

      response.barcodeData = barcodeData;

      const info = this.barcodeInfo.conc;

      const barcodeInfo = {
        prod: info.prod[barcodeData.prodId],
        seg: info.seg[barcodeData.segId],
        refValue: info.refValue[barcodeData.refValueId],
      };

      response.barcodeInfo = barcodeInfo;

      this.respSuccess(response);
    } else {
      this.respError("código de barras inválido", "0000x0");
    }
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
};
