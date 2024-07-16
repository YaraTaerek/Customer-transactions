import React, { useState, useMemo } from 'react';
import { useTable, useFilters, useSortBy } from 'react-table';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-moment';
import moment from 'moment';
import data from './data/db.json';
import './CustomerTable.css';

// Register Chart.js components
Chart.register(...registerables);

// Custom filter function for transactions
function transactionFilter(rows, id, filterValue) {
  return rows.map(row => {
    const filteredTransactions = row.original.transactions.filter(transaction =>
      transaction.amount.toString().includes(filterValue)
    );
    return {
      ...row,
      original: {
        ...row.original,
        transactions: filteredTransactions,
      },
    };
  }).filter(row => row.original.transactions.length > 0);
}

const CustomerTable = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Memoizing merged data to prevent unnecessary re-renders
  const groupedData = useMemo(() => {
    const grouped = {};
    data.transactions.forEach((transaction) => {
      const customer = data.customers.find(c => c.id === transaction.customer_id);
      const customerName = customer ? customer.name : 'Unknown';
      if (!grouped[customerName]) {
        grouped[customerName] = [];
      }
      grouped[customerName].push(transaction);
    });
    return grouped;
  }, []);

  const columns = useMemo(
    () => [
      {
        Header: 'Customer Name',
        accessor: 'customerName',
      },
      {
        Header: 'Transaction Data',
        accessor: 'transactions',
        Cell: ({ value }) => (
          <ul>
            {value.map((transaction, index) => (
              <li key={index}>
                Date: {transaction.date}, Amount: ${transaction.amount}
              </li>
            ))}
          </ul>
        ),
        filter: transactionFilter
      },
    ],
    []
  );

  const dataForTable = useMemo(() => {
    return Object.keys(groupedData).map((customerName) => ({
      customerName,
      transactions: groupedData[customerName],
    }));
  }, [groupedData]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setFilter,
  } = useTable({ columns, data: dataForTable }, useFilters, useSortBy);

  const handleNameFilterChange = (e) => {
    const value = e.target.value || '';
    setFilter('customerName', value.toLowerCase());
  };

  const handleAmountFilterChange = (e) => {
    const value = e.target.value || '';
    setFilter('transactions', value);
  };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
  };

  const transactions = useMemo(() => {
    return selectedCustomer
      ? groupedData[selectedCustomer.customerName]
      : [];
  }, [selectedCustomer, groupedData]);

  const transactionAmountsPerDay = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      const date = transaction.date;
      acc[date] = (acc[date] || 0) + transaction.amount;
      return acc;
    }, {});
  }, [transactions]);

  const chartData = useMemo(() => {
    return {
      labels: Object.keys(transactionAmountsPerDay).map((date) =>
        moment(date, 'YYYY-MM-DD')
      ),
      datasets: [
        {
          label: 'Transaction Amount',
          data: Object.values(transactionAmountsPerDay),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [transactionAmountsPerDay]);

  const chartOptions = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          parser: 'YYYY-MM-DD',
          tooltipFormat: 'll',
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Transaction Amount',
        },
      },
    },
  };

  return (
    <div className="customer-container">
      <div className="filters">
        <input
          type="text"
          placeholder="Filter by customer name"
          onChange={handleNameFilterChange}
          className="filter-input"
        />
        <input
          type="number"
          placeholder="Filter by transaction amount"
          onChange={handleAmountFilterChange}
          className="filter-input"
        />
      </div>
      <div className="table-and-graph">
        <table {...getTableProps()} className="customer-table">
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                    {column.render('Header')}
                    <span className="sort-arrows">
                      <span className={column.isSorted && !column.isSortedDesc ? 'sort-arrow active' : 'sort-arrow'}>🔼</span>
                      <span className={column.isSorted && column.isSortedDesc ? 'sort-arrow active' : 'sort-arrow'}>🔽</span>
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()} onClick={() => handleCustomerClick(row.original)}>
                  {row.cells.map((cell) => (
                    <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {selectedCustomer && (
          <div className="customer-details">
            <h2>{selectedCustomer.customerName}'s Transactions</h2>
            <div className="chart-container">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTable;
