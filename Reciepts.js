$(document).ready(function () {
  $("#navbar").load("Navbar.html", function () {
    $("#Receipt").addClass("active");
  });

  $("#addRow").click(function () {
    var newRow = $("#itemsTable tbody tr:first").clone();
    newRow.find("input").val("");
    $("#itemsTable tbody").append(newRow);
  });

  $(document).on("click", ".removeRow", function () {
    if ($("#itemsTable tbody tr").length > 1) {
      $(this).closest("tr").remove();
      calculateGrand();
    }
  });

  let itemsList = [];

  // Fetch items from Google Sheet (your items sheet)
  $.getJSON(
    "https://script.google.com/macros/s/AKfycby7v4NFI2cn1JpnI5EUTxpDwhALanwnb5aQ1K9jk95CTXVzii1-cYxngMrcqpyUJ6rf8A/exec",
    function (data) {
      itemsList = data; // data = [{name: "Apple", unitCost: 50}, ...]
    },
  );

  // Autocomplete for item names
  $(document).on("focus", ".itemName", function () {
    $(this).autocomplete({
      source: itemsList.map((i) => i.name),
      select: function (event, ui) {
        var selectedItem = itemsList.find((i) => i.name === ui.item.value);
        var row = $(this).closest("tr");
        row.find(".unitCost").val(selectedItem.unitCost);
        calculateRow(row);
      },
      minLength: 1,
    });
  });

  function calculateRow(row, changedField) {
    var qty = parseFloat(row.find(".quantity").val()) || 0;
    var price = parseFloat(row.find(".price").val()) || 0;
    var totalSales = parseFloat(row.find(".totalSales").val()) || 0;
    var unitCost = parseFloat(row.find(".unitCost").val()) || 0;

    // If price OR quantity changed → compute total
    if (changedField === "price" || changedField === "quantity") {
      totalSales = qty * price;
      row.find(".totalSales").val(totalSales.toFixed(2));
    }

    // If total changed → compute price
    if (changedField === "totalSales") {
      if (qty > 0) {
        price = totalSales / qty;
        row.find(".price").val(price.toFixed(2));
      }
    }

    // Recalculate profit
    var costOfGoods = qty * unitCost;
    var profit = totalSales - costOfGoods;

    row.find(".cog").val(costOfGoods.toFixed(2));
    row.find(".profit").val(profit.toFixed(2));
  }

  // Recalculate row when quantity, price, or unit cost changes
  $(document).on(
    "input",
    ".quantity, .price, .unitCost, .totalSales",
    function () {
      var row = $(this).closest("tr");

      var changedField = "";

      if ($(this).hasClass("quantity")) {
        changedField = "quantity";
      }

      if ($(this).hasClass("price")) {
        changedField = "price";
      }

      if ($(this).hasClass("totalSales")) {
        changedField = "totalSales";
      }

      calculateRow(row, changedField);
    },
  );

  // Submit form
  $("#receiptForm").submit(function (e) {
    e.preventDefault();

    var items = [];

    $("#itemsTable tbody tr").each(function () {
      items.push({
        name: $(this).find(".itemName").val(),
        quantity: $(this).find(".quantity").val(),
        price: $(this).find(".price").val(),
        unit_cost: $(this).find(".unitCost").val(),
        total_sales: $(this).find(".totalSales").val(),
        cost_of_goods: $(this).find(".cog").val(),
        profit: $(this).find(".profit").val(),
      });
    });

    fetch(
      "https://script.google.com/macros/s/AKfycbwpH6_i7aAVYk03po_o1svJXzIk6R71vUmEzfg2Bx-cxfVQybjlbnyCuruAWDoq4ORRkg/exec",
      {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          date: $("input[id='Date']").val(),
          dr_number: $("input[id='DRnumber']").val(),
          customer: $("input[id='Customer']").val(),
          items: JSON.stringify(items),
        }),
      },
    );

    // Show alert
    $("#alertContainer").html(`
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        Receipt saved successfully!
      </div>
    `);

    // Auto close after 3 seconds
    setTimeout(function () {
      var alertEl = document.querySelector(".alert");
      if (alertEl) {
        var bsAlert = new bootstrap.Alert(alertEl);
        bsAlert.close();
      }
    }, 1500);

    $("#itemsTable tbody").html(`
      <tr>
        <td>
          <input type="text" class="itemName form-control" />
        </td>
        <td>
          <input type="number" class="quantity form-control" step="any" />
        </td>
        <td>
          <input type="number" class="price form-control" step="any" />
        </td>
        <td>
          <input type="number" class="totalSales form-control" step="any" />
        </td>
        <td>
          <input type="number" class="unitCost form-control" step="any" />
        </td>
        <td>
          <input type="number" class="cog form-control" step="any" />
        </td>
        <td>
          <input type="number" class="profit form-control" step="any" />
        </td>
        <td>
          <button type="button" class="removeRow btn btn-light">
            <i class="bi bi-trash-fill text-danger"></i>
          </button>
        </td>
      </tr>
    `);

    // Clear DR Number field
    $("input[id='Customer']").val("");

    // Increment DR Number by 1
    var drNumInput = $("input[id='DRnumber']");
    var currentDR = parseInt(drNumInput.val()) || 0;
    drNumInput.val(currentDR + 1); // increment by 1
  });
});
